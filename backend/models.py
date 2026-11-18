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
    # a Nigerian mobile (0803…, 234803… or +234803…), or any other country's number written with its + code
    phone: str = Field(pattern=r"^(0[789][01][0-9]{8}|\+?234[789][01][0-9]{8}|\+[1-9][0-9]{9,14})$")
    # name@domain.tld: no spaces, no double dots, and an ending of at least two letters
    email: str = Field(max_length=120, pattern=r"^[A-Za-z0-9._%+\-]+@([A-Za-z0-9\-]+\.)+[A-Za-z]{2,}$")
    items: List[OrderItem] = Field(min_length=1, max_length=20)


if __name__ == "__main__":
    # Self-check: python models.py
    from pydantic import ValidationError

    def accepted(**change) -> bool:
        order = {"name": "Ada Obi", "phone": "08031234567", "email": "ada@example.com", "items": [{"id": "x", "qty": 1}]}
        try:
            OrderRequest(**{**order, **change})
            return True
        except ValidationError:
            return False

    for phone in ["08031234567", "09012345678", "+2348031234567", "2348031234567", "+447911123456"]:
        assert accepted(phone=phone), f"should accept phone {phone}"
    for phone in ["123456", "1234567", "0803123456", "080312345678", "01234567890", "0803 123 4567", "abcdefghijk", ""]:
        assert not accepted(phone=phone), f"should reject phone {phone!r}"
    for email in ["ada@example.com", "a.b+shop@stu.cu.edu.ng"]:
        assert accepted(email=email), f"should accept email {email}"
    for email in ["ada", "ada@example", "a@b.c", "ada @example.com", "ada@@example.com", "ada@example..com", "@example.com", "ada@.com", ""]:
        assert not accepted(email=email), f"should reject email {email!r}"
    print("models self-check ok")
