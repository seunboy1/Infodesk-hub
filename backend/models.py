from pydantic import BaseModel, Field
from typing import List, Optional


class LinkBase(BaseModel):
    name: str
    desc: str = ""
    cat: str = "membership"  # Any category string allowed (e.g. membership, discipleship, custom ones)
    url: str
    active: bool = True


class LinkCreate(LinkBase):
    pass


class LinkUpdate(LinkBase):
    pass


class Link(LinkBase):
    id: str
    qr_image: Optional[str] = None  # URL to uploaded QR image, or None = auto-generate

    class Config:
        from_attributes = True


class AdminLink(Link):
    """Link with row number for admin operations."""
    row_num: int


class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    ok: bool


# ── Announcements ─────────────────────────────────────────────────────────────

class AnnouncementBase(BaseModel):
    title: str
    message: str
    active: bool = True


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(AnnouncementBase):
    pass


class Announcement(AnnouncementBase):
    id: str

    class Config:
        from_attributes = True


class AdminAnnouncement(Announcement):
    """Announcement with row number for admin operations."""
    row_num: int


# ── Giving Accounts ──────────────────────────────────────────────────────────

class GivingAccountBase(BaseModel):
    label: str  # e.g. "Offering", "Rent"
    account_number: str
    bank_name: str = "Access Bank"
    active: bool = True


class GivingAccountCreate(GivingAccountBase):
    pass


class GivingAccountUpdate(GivingAccountBase):
    pass


class GivingAccount(GivingAccountBase):
    id: str

    class Config:
        from_attributes = True


class AdminGivingAccount(GivingAccount):
    """Giving account with row number for admin operations."""
    row_num: int


# ── Ezra chat ────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


# ── Bookstore ────────────────────────────────────────────────────────────────

class OrderItem(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    qty: int = Field(ge=1, le=10)


class OrderRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(pattern=r"^\+?[0-9]{7,15}$")
    email: str = Field(max_length=120, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    items: List[OrderItem] = Field(min_length=1, max_length=20)
