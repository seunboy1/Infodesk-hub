import logging
from fastapi import APIRouter, HTTPException, Request
from services.sheets import get_all_rows, get_all_announcements, get_all_giving_accounts
from services import ezra
from routers.admin import client_ip
from models import Link, Announcement, GivingAccount, ChatRequest
from typing import List

router = APIRouter()


@router.get("/links", response_model=List[Link])
def get_links():
    """Return all active links for the public directory."""
    try:
        rows = get_all_rows(include_hidden=False)
        return rows
    except Exception:
        logging.exception("public request failed")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


@router.get("/announcements", response_model=List[Announcement])
def get_announcements():
    """Return all active announcements for the public directory."""
    try:
        return get_all_announcements(include_hidden=False)
    except Exception:
        logging.exception("public request failed")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


@router.get("/giving", response_model=List[GivingAccount])
def get_giving_accounts():
    """Return all active giving accounts for the public directory."""
    try:
        return get_all_giving_accounts(include_hidden=False)
    except Exception:
        logging.exception("public request failed")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


@router.post("/chat")
def chat(body: ChatRequest, request: Request):
    """Ezra: answer a visitor's question from the links, announcements and Q&A sheet."""
    try:
        return ezra.answer(body.question, client_ip(request))
    except Exception:
        logging.exception("public request failed")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
