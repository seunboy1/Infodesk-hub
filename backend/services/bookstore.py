"""Bookstore orders, paid through Squad.

An order is saved to the sheet before the buyer leaves to pay, and is only
marked paid after Squad itself confirms the money arrived.
"""
import hashlib
import hmac
import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import httpx

from config import get_settings
from services import sheets

settings = get_settings()

# shortcut: one lock in one process stops the webhook and the return page both taking stock;
# move to a real store if the backend ever runs as more than one instance.
_confirming = threading.Lock()


def parse_items(items: str) -> List[Tuple[str, int]]:
    """'Love Code x2; Purposefully x1' -> [('Love Code', 2), ('Purposefully', 1)]. No number counts as one copy."""
    pairs = []
    for line in filter(None, (part.strip() for part in items.split(";"))):
        title, _, qty = line.rpartition(" x")
        pairs.append((title, int(qty)) if title and qty.isdigit() else (line, 1))
    return pairs


def _auth() -> dict:
    return {"Authorization": f"Bearer {settings.squad_secret_key}"}


def create_order(name: str, phone: str, email: str, items: Dict[str, int], page: str = "bookstore") -> dict:
    """items maps book id to quantity. Returns the order ref and Squad's payment page address."""
    if not settings.squad_secret_key:
        raise ValueError("Payments are not switched on yet.")
    books = {b["id"]: b for b in sheets.get_books()}
    lines, books_total = [], 0
    for book_id, qty in items.items():
        book = books.get(book_id)
        if not book:
            raise ValueError("One of these books is no longer available.")
        if qty > book["stock"]:
            raise ValueError(f"Only {book['stock']} left of {book['title']}.")
        lines.append(f"{book['title']} x{qty}")
        books_total += book["price"] * qty
    ref = "AJ" + uuid.uuid4().hex[:10].upper()
    site = settings.frontend_url.split(",")[0].strip()

    r = httpx.post(
        f"{settings.squad_base_url}/transaction/initiate",
        headers=_auth(),
        json={
            "amount": books_total * 100,  # Squad counts in kobo
            "pass_charge": True,  # Squad adds its own fee on top for the buyer, so the church gets the full price
            "email": email,
            "currency": "NGN",
            "initiate_type": "inline",
            "transaction_ref": ref,
            "customer_name": name,
            "callback_url": f"{site}/{page}?order={ref}",
        },
        timeout=30,
    )
    r.raise_for_status()
    checkout_url = r.json()["data"]["checkout_url"]

    sheets.add_order({
        "ref": ref,
        "time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "name": name, "phone": phone, "email": email,
        "items": "; ".join(lines),
        "books_total": books_total, "charge": "", "total": "",  # filled in from Squad's figures once paid
        "status": "pending",
    })
    return {"ref": ref, "checkout_url": checkout_url}


def confirm(ref: str) -> Optional[dict]:
    """Return the order, first marking it paid if Squad says the money arrived."""
    with _confirming:
        order = sheets.get_order(ref)
        if not order or order["status"] != "pending":
            return order
        r = httpx.get(f"{settings.squad_base_url}/transaction/verify/{ref}", headers=_auth(), timeout=30)
        data = (r.json().get("data") or {}) if r.status_code == 200 else {}
        # paid means Squad says success AND the church's share covers the books (both figures are in kobo)
        paid = (str(data.get("transaction_status", "")).lower() == "success"
                and int(data.get("merchant_amount") or 0) >= int(order["books_total"]) * 100)
        if paid:
            # Squad reports its fee separately, in naira; the buyer paid the books plus that fee
            charge = round(float(data.get("fee") or 0))
            total = int(order["books_total"]) + charge
            by_title = {b["title"]: b for b in sheets.get_books()}
            stock, short = {}, False
            for title, qty in parse_items(order["items"]):
                book = by_title.get(title)
                if book:
                    # two buyers can pay for the same last copy; the desk must see that
                    short = short or qty > book["stock"]
                    stock[book["row_num"]] = max(0, book["stock"] - qty)
            order.update(charge=charge, total=total, status="paid - short" if short else "paid")
            sheets.mark_paid(order["row_num"], charge, total, order["status"], stock)
        return order


def valid_signature(body: bytes, signature: str) -> bool:
    """Squad signs each webhook: HMAC-SHA512 of the raw body with our secret key, in upper-case hex."""
    if not settings.squad_secret_key:
        return False
    expected = hmac.new(settings.squad_secret_key.encode(), body, hashlib.sha512).hexdigest().upper()
    return hmac.compare_digest(expected, (signature or "").upper())


if __name__ == "__main__":
    # Self-check: python -m services.bookstore
    settings.squad_secret_key = "sandbox_sk_test"
    body = b'{"Event":"charge_successful"}'
    good = hmac.new(b"sandbox_sk_test", body, hashlib.sha512).hexdigest()
    assert valid_signature(body, good) and valid_signature(body, good.upper())
    assert not valid_signature(body, "") and not valid_signature(body + b" ", good)
    assert parse_items("Love Code x2; Purposefully x1") == [("Love Code", 2), ("Purposefully", 1)]
    assert parse_items("Love Code") == [("Love Code", 1)] and parse_items("") == []

    # confirm(): a fake sheet and a fake Squad, so no real call is made
    class FakeSheets:
        def __init__(self, stock):
            self.order = {"ref": "R1", "items": "Love Code x2", "books_total": "15000", "status": "pending", "row_num": 2}
            self.stock, self.writes = stock, 0
        def get_order(self, ref): return dict(self.order)
        def get_books(self): return [{"title": "Love Code", "stock": self.stock, "row_num": 7}]
        def mark_paid(self, row_num, charge, total, status, stock):
            self.order.update(status=status, charge=charge, total=total)
            self.stock, self.writes = stock[7], self.writes + 1

    class FakeSquad:
        def __init__(self, data): self.data = data
        def get(self, *a, **k): return type("R", (), {"status_code": 200, "json": lambda _: {"data": self.data}})()

    real_sheets, real_httpx = sheets, httpx
    try:
        ok = {"transaction_status": "Success", "merchant_amount": 1500000, "fee": 150}
        sheets, httpx = FakeSheets(5), FakeSquad(ok)
        assert confirm("R1")["status"] == "paid" and sheets.stock == 3 and sheets.order["total"] == 15150
        assert confirm("R1")["status"] == "paid" and sheets.writes == 1  # a second call takes no more stock
        sheets, httpx = FakeSheets(1), FakeSquad(ok)
        assert confirm("R1")["status"] == "paid - short" and sheets.stock == 0
        sheets, httpx = FakeSheets(5), FakeSquad({**ok, "merchant_amount": 1499900})
        assert confirm("R1")["status"] == "pending" and sheets.writes == 0  # underpaid
        sheets, httpx = FakeSheets(5), FakeSquad({**ok, "transaction_status": "failed"})
        assert confirm("R1")["status"] == "pending"
    finally:
        sheets, httpx = real_sheets, real_httpx
    print("bookstore self-check ok")
