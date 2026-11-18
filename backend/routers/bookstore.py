import json
import logging
from fastapi import APIRouter, HTTPException, Request
from services import bookstore, sheets
from routers.admin import check_rate_limit, client_ip
from models import OrderRequest

router = APIRouter()


@router.get("/books")
def get_books():
    """Return the books on sale, with how many copies are left."""
    try:
        return [{k: v for k, v in b.items() if k != "row_num"} for b in sheets.get_books()]
    except Exception:
        logging.exception("books failed")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


@router.post("/orders")
def create_order(body: OrderRequest, request: Request):
    """Save an order and return the payment page to send the buyer to."""
    check_rate_limit(f"order:{client_ip(request)}")
    items = {}
    for item in body.items:
        items[item.id] = items.get(item.id, 0) + item.qty
    try:
        return bookstore.create_order(body.name.strip(), body.phone, body.email, items)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="We couldn't reach the payment service. Please try again.")


@router.post("/orders/webhook")
async def squad_webhook(request: Request):
    """Squad calls this when a payment lands, even if the buyer never returns to the site."""
    raw = await request.body()
    if not bookstore.valid_signature(raw, request.headers.get("x-squad-encrypted-body", "")):
        raise HTTPException(status_code=401, detail="Bad signature")
    ref = json.loads(raw).get("TransactionRef", "")
    if ref:
        bookstore.confirm(str(ref))
    return {"ok": True}


@router.get("/orders/{ref}")
def get_order(ref: str):
    """What the buyer sees on return: the order, checked against Squad if still unpaid."""
    try:
        order = bookstore.confirm(ref)
    except Exception:
        raise HTTPException(status_code=502, detail="We couldn't check this payment just now.")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    count = sum(qty for _, qty in bookstore.parse_items(order["items"]))
    # "paid - short" is for the desk; the buyer has paid either way
    status = "paid" if order["status"].startswith("paid") else order["status"]
    return {"ref": order["ref"], "status": status, "items": order["items"],
            "count": count, "total": int(order["total"] or order["books_total"])}
