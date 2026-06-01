import time
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response
from typing import List
from models import (
    LinkCreate, LinkUpdate, AdminLink, LoginRequest,
    AnnouncementCreate, AnnouncementUpdate, AdminAnnouncement
)
from services.sheets import (
    get_all_rows, add_row, update_row, update_qr_image, delete_row,
    get_all_announcements, add_announcement, update_announcement, delete_announcement
)
from services.qr import upload_custom_qr
from auth import create_token, require_admin
from config import get_settings

router = APIRouter(prefix="/admin")
settings = get_settings()

COOKIE_NAME = "infodesk_token"
COOKIE_MAX_AGE = 60 * 60 * 8  # 8 hours


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(body: LoginRequest, response: Response):
    if body.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Wrong password")
    token = create_token()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
        max_age=COOKIE_MAX_AGE,
    )
    return {"ok": True}


@router.delete("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


@router.get("/me")
def me(authenticated: bool = Depends(require_admin)):
    return {"authenticated": True}


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
        link_id = str(int(time.time() * 1000))
        add_row(link_id, body.name, body.desc, body.cat, body.url)
        return {"id": link_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/links/{link_id}")
def edit_link(link_id: str, body: LinkUpdate, row_num: int, authenticated: bool = Depends(require_admin)):
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
        announcement_id = str(int(time.time() * 1000))
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
    try:
        delete_announcement(row_num)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
