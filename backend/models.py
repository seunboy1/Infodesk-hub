from pydantic import BaseModel
from typing import Optional, Literal

CategoryType = Literal["membership", "new_members", "testimony", "books", "connect", "map", "giving", "devotion", "counselling"]


class LinkBase(BaseModel):
    name: str
    desc: str = ""
    cat: CategoryType = "membership"
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
