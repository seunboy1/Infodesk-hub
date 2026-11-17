"""Bookstore orders, paid through Squad.

An order is saved to the sheet before the buyer leaves to pay, and is only
marked paid after Squad itself confirms the money arrived.
"""
import hashlib
import hmac
import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

import httpx

from config import get_settings
from services import sheets

settings = get_settings()

# shortcut: one lock in one process stops the webhook and the return page both taking stock;
# move to a real store if the backend ever runs as more than one instance.
_confirming = threading.Lock()


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
            order.update(charge=charge, total=total, status="paid")
            # status first, so a repeat call can never take stock twice
            sheets.set_order_paid(order["row_num"], order["charge"], total)
            by_title = {b["title"]: b for b in sheets.get_books()}
            for line in order["items"].split("; "):
                title, qty = line.rsplit(" x", 1)
                if title in by_title:
                    sheets.take_stock(by_title[title]["row_num"], int(qty))
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
    print("bookstore self-check ok")
