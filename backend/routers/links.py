from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from services.sheets import get_all_rows, get_all_announcements
from services.qr import generate_qr_bytes
from models import Link, Announcement
from typing import List

router = APIRouter()


@router.get("/links", response_model=List[Link])
def get_links():
    """Return all active links for the public directory."""
    try:
        rows = get_all_rows(include_hidden=False)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/links/{link_id}/qr.png")
def get_qr_image(link_id: str):
    """
    Auto-generate and return a QR code PNG for a given link.
    The frontend calls this when no custom qr_image is set.
    """
    try:
        rows = get_all_rows(include_hidden=True)
        link = next((r for r in rows if r["id"] == link_id), None)
        if not link:
            raise HTTPException(status_code=404, detail="Link not found")
        img_bytes = generate_qr_bytes(link["url"])
        return Response(content=img_bytes, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/announcements", response_model=List[Announcement])
def get_announcements():
    """Return all active announcements for the public directory."""
    try:
        return get_all_announcements(include_hidden=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
