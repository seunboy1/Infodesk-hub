import uuid
import time
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response, Request
from typing import List
from models import (
    LinkCreate, LinkUpdate, AdminLink, LoginRequest,
    AnnouncementCreate, AnnouncementUpdate, AdminAnnouncement,
    GivingAccountCreate, GivingAccountUpdate, AdminGivingAccount
)
from services.sheets import (
    get_all_rows, add_row, update_row, update_qr_image, delete_row,
    get_all_announcements, add_announcement, update_announcement, delete_announcement,
    get_all_giving_accounts, add_giving_account, update_giving_account, delete_giving_account,
    get_paid_orders, row_has_id,
    SHEET_NAME, ANNOUNCEMENTS_SHEET_NAME, GIVING_SHEET_NAME
)
from services.bookstore import parse_items
from services.qr import upload_custom_qr
from auth import create_token, require_admin
from config import get_settings

router = APIRouter(prefix="/admin")
settings = get_settings()

COOKIE_NAME = "infodesk_token"
COOKIE_MAX_AGE = 60 * 60 * 8  # 8 hours
# Live, the site and the backend are on different domains, which needs "none" plus HTTPS.
# Browsers throw away a "none" cookie sent without HTTPS, so on a laptop (plain http) use "lax".
SAMESITE = "none" if settings.secure_cookies else "lax"

# Rate limiting for login: max 5 attempts per minute per IP
LOGIN_ATTEMPTS = defaultdict(list)
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 60


def client_ip(request: Request) -> str:
    """The visitor's address, for rate limits."""
    # Render sits behind Cloudflare, which sets this header itself, so a caller can't fake it
    real = request.headers.get("cf-connecting-ip")
    if real:
        return real
    # shortcut: the first X-Forwarded-For entry can be faked by the caller; fine as a fallback off Render
    return request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "unknown")


def check_rate_limit(ip: str):
    """Check if IP has exceeded login rate limit."""
    now = time.time()
    if len(LOGIN_ATTEMPTS) > 10000:  # don't let old addresses pile up forever
        LOGIN_ATTEMPTS.clear()
    # Clean old attempts
    LOGIN_ATTEMPTS[ip] = [t for t in LOGIN_ATTEMPTS[ip] if now - t < WINDOW_SECONDS]
    if len(LOGIN_ATTEMPTS[ip]) >= MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in a minute.")
    LOGIN_ATTEMPTS[ip].append(now)


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response):
    # Rate limit by visitor; without Cloudflare's header everyone shares one counter, which still stops guessing
    check_rate_limit(request.headers.get("cf-connecting-ip") or (request.client.host if request.client else "unknown"))

    if body.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Wrong password")
    token = create_token()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=SAMESITE,
        secure=settings.secure_cookies,
        max_age=COOKIE_MAX_AGE,
    )
    return {"ok": True}


@router.delete("/logout")
def logout(response: Response):
    # must carry the same cross-site settings as the login cookie, or the browser ignores the delete
    response.delete_cookie(COOKIE_NAME, httponly=True, samesite=SAMESITE, secure=settings.secure_cookies)
    return {"ok": True}


@router.get("/me")
def me(authenticated: bool = Depends(require_admin)):
    return {"authenticated": True}


def _must_match(sheet_name: str, row_num: int, item_id: str):
    """Stop an edit or delete landing on the wrong row after someone else changed the sheet."""
    if not row_has_id(sheet_name, row_num, item_id):
        raise HTTPException(status_code=409, detail="This list has changed. Refresh the page and try again.")


# ── Links CRUD ────────────────────────────────────────────────────────────────

@router.get("/links", response_model=List[AdminLink])
def list_links(authenticated: bool = Depends(require_admin)):
    """Return all links including hidden ones."""
    try:
        return get_all_rows(include_hidden=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/links", status_code=201)
def create_link(body: LinkCreate, authenticated: bool = Depends(require_admin)):
    try:
        link_id = str(uuid.uuid4())
        add_row(link_id, body.name, body.desc, body.cat, body.url)
        return {"id": link_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/links/{link_id}")
def edit_link(link_id: str, body: LinkUpdate, row_num: int, authenticated: bool = Depends(require_admin)):
    _must_match(SHEET_NAME, row_num, link_id)
    try:
        update_row(row_num, {
            "id": link_id,
            "name": body.name,
            "desc": body.desc,
            "cat": body.cat,
            "url": body.url,
            "active": body.active,
        })
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/links/{link_id}")
def remove_link(link_id: str, row_num: int, authenticated: bool = Depends(require_admin)):
    _must_match(SHEET_NAME, row_num, link_id)
    try:
        delete_row(row_num)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── QR image upload ───────────────────────────────────────────────────────────

@router.post("/links/{link_id}/qr")
async def upload_qr(
    link_id: str,
    row_num: int,
    file: UploadFile = File(...),
    authenticated: bool = Depends(require_admin),
):
    """Upload a custom QR image for a link. Stored in Cloudinary."""
    _must_match(SHEET_NAME, row_num, link_id)
    try:
        contents = await file.read()
        url = upload_custom_qr(contents, link_id)
        update_qr_image(row_num, url)
        return {"qr_image": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/links/{link_id}/qr")
def remove_custom_qr(link_id: str, row_num: int, authenticated: bool = Depends(require_admin)):
    """Remove custom QR — app will auto-generate from URL instead."""
    _must_match(SHEET_NAME, row_num, link_id)
    try:
        update_qr_image(row_num, "")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Announcements CRUD ─────────────────────────────────────────────────────────

@router.get("/announcements", response_model=List[AdminAnnouncement])
def list_announcements(authenticated: bool = Depends(require_admin)):
    """Return all announcements including hidden ones."""
    try:
        return get_all_announcements(include_hidden=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/announcements", status_code=201)
def create_announcement(body: AnnouncementCreate, authenticated: bool = Depends(require_admin)):
    try:
        announcement_id = str(uuid.uuid4())
        add_announcement(announcement_id, body.title, body.message)
        return {"id": announcement_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/announcements/{announcement_id}")
def edit_announcement(
    announcement_id: str,
    body: AnnouncementUpdate,
    row_num: int,
    authenticated: bool = Depends(require_admin)
):
    _must_match(ANNOUNCEMENTS_SHEET_NAME, row_num, announcement_id)
    try:
        update_announcement(row_num, {
            "id": announcement_id,
            "title": body.title,
            "message": body.message,
            "active": body.active,
        })
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/announcements/{announcement_id}")
def remove_announcement(announcement_id: str, row_num: int, authenticated: bool = Depends(require_admin)):
    _must_match(ANNOUNCEMENTS_SHEET_NAME, row_num, announcement_id)
    try:
        delete_announcement(row_num)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Giving Accounts CRUD ─────────────────────────────────────────────────────

@router.get("/giving", response_model=List[AdminGivingAccount])
def list_giving_accounts(authenticated: bool = Depends(require_admin)):
    """Return all giving accounts including hidden ones."""
    try:
        return get_all_giving_accounts(include_hidden=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/giving", status_code=201)
def create_giving_account(body: GivingAccountCreate, authenticated: bool = Depends(require_admin)):
    try:
        account_id = str(uuid.uuid4())
        add_giving_account(account_id, body.label, body.account_number, body.bank_name)
        return {"id": account_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/giving/{account_id}")
def edit_giving_account(
    account_id: str,
    body: GivingAccountUpdate,
    row_num: int,
    authenticated: bool = Depends(require_admin)
):
    _must_match(GIVING_SHEET_NAME, row_num, account_id)
    try:
        update_giving_account(row_num, {
            "id": account_id,
            "label": body.label,
            "account_number": body.account_number,
            "bank_name": body.bank_name,
            "active": body.active,
        })
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/giving/{account_id}")
def remove_giving_account(account_id: str, row_num: int, authenticated: bool = Depends(require_admin)):
    _must_match(GIVING_SHEET_NAME, row_num, account_id)
    try:
        delete_giving_account(row_num)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Book desk ──────────────────────────────────────────────────────────────────

def _lagos_time(saved: str) -> str:
    """Orders are saved in UTC; the desk reads Nigeria time (UTC+1, no clock changes)."""
    try:
        return (datetime.strptime(saved, "%Y-%m-%d %H:%M UTC") + timedelta(hours=1)).strftime("%d %b, %I:%M %p")
    except ValueError:
        return saved


@router.get("/orders")
def list_orders(authenticated: bool = Depends(require_admin)):
    """Paid book orders, newest first, for the volunteer at the book desk."""
    try:
        return [{
            "ref": str(o["ref"]), "time": _lagos_time(str(o["time"])), "name": str(o["name"]), "items": str(o["items"]),
            "count": sum(qty for _, qty in parse_items(str(o["items"]))),
            "total": int(o["total"] or o["books_total"]),
            "short": str(o["status"]) != "paid",  # paid, but the last copy went to someone else
        } for o in get_paid_orders()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
