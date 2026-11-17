import json
import time
import gspread
from functools import lru_cache
from google.oauth2.service_account import Credentials
from typing import List, Optional
from config import get_settings

settings = get_settings()

SHEET_NAME = "Links"
HEADERS = ["id", "name", "desc", "cat", "url", "qr_image", "active"]

ANNOUNCEMENTS_SHEET_NAME = "Announcements"
ANNOUNCEMENTS_HEADERS = ["id", "title", "message", "active"]
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


@lru_cache(maxsize=1)
def _get_client() -> gspread.Client:
    """Cached Google Sheets client - reused across requests."""
    creds_dict = json.loads(settings.google_service_account_json)
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    return gspread.authorize(creds)


@lru_cache(maxsize=1)
def _get_spreadsheet():
    """Cached spreadsheet - reused across requests."""
    client = _get_client()
    return client.open_by_key(settings.google_sheet_id)


def _get_worksheet() -> gspread.Worksheet:
    spreadsheet = _get_spreadsheet()
    try:
        ws = spreadsheet.worksheet(SHEET_NAME)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=SHEET_NAME, rows=500, cols=len(HEADERS))
        ws.append_row(HEADERS)
    return ws


def get_all_rows(include_hidden: bool = False) -> List[dict]:
    ws = _get_worksheet()
    records = ws.get_all_records(expected_headers=HEADERS)
    result = []
    for i, row in enumerate(records, start=2):  # row 1 = headers
        if not include_hidden and str(row.get("active", "true")).lower() == "false":
            continue
        result.append({
            "id": str(row.get("id", "")),
            "name": row.get("name", ""),
            "desc": row.get("desc", ""),
            "cat": row.get("cat", "forms"),
            "url": row.get("url", ""),
            "qr_image": row.get("qr_image") or None,
            "active": str(row.get("active", "true")).lower() != "false",
            "row_num": i,
        })
    return result


def add_row(link_id: str, name: str, desc: str, cat: str, url: str) -> None:
    ws = _get_worksheet()
    ws.append_row([link_id, name, desc, cat, url, "", "true"])


def update_row(row_num: int, data: dict) -> None:
    ws = _get_worksheet()
    # column F (the uploaded QR image) is left alone, so an edit never wipes it
    ws.batch_update([
        {"range": f"A{row_num}:E{row_num}",
         "values": [[data["id"], data["name"], data["desc"], data["cat"], data["url"]]]},
        {"range": f"G{row_num}", "values": [["true" if data.get("active", True) else "false"]]},
    ])


def update_qr_image(row_num: int, qr_url: str) -> None:
    ws = _get_worksheet()
    ws.update_cell(row_num, 6, qr_url)  # column F = qr_image


def delete_row(row_num: int) -> None:
    ws = _get_worksheet()
    ws.delete_rows(row_num)


def row_has_id(sheet_name: str, row_num: int, item_id: str) -> bool:
    """True if that row still holds that item; rows shift when someone else adds or deletes one."""
    return str(_get_spreadsheet().worksheet(sheet_name).cell(row_num, 1).value) == item_id


# ── Announcements ─────────────────────────────────────────────────────────────

def _get_announcements_worksheet() -> gspread.Worksheet:
    spreadsheet = _get_spreadsheet()
    try:
        ws = spreadsheet.worksheet(ANNOUNCEMENTS_SHEET_NAME)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=ANNOUNCEMENTS_SHEET_NAME, rows=100, cols=len(ANNOUNCEMENTS_HEADERS))
        ws.append_row(ANNOUNCEMENTS_HEADERS)
    return ws


def get_all_announcements(include_hidden: bool = False) -> List[dict]:
    ws = _get_announcements_worksheet()
    records = ws.get_all_records(expected_headers=ANNOUNCEMENTS_HEADERS)
    result = []
    for i, row in enumerate(records, start=2):  # row 1 = headers
        if not include_hidden and str(row.get("active", "true")).lower() == "false":
            continue
        result.append({
            "id": str(row.get("id", "")),
            "title": row.get("title", ""),
            "message": row.get("message", ""),
            "active": str(row.get("active", "true")).lower() != "false",
            "row_num": i,
        })
    return result


def add_announcement(announcement_id: str, title: str, message: str) -> None:
    ws = _get_announcements_worksheet()
    ws.append_row([announcement_id, title, message, "true"])


def update_announcement(row_num: int, data: dict) -> None:
    ws = _get_announcements_worksheet()
    ws.update(
        f"A{row_num}:D{row_num}",
        [[
            data["id"],
            data["title"],
            data["message"],
            "true" if data.get("active", True) else "false",
        ]]
    )


def delete_announcement(row_num: int) -> None:
    ws = _get_announcements_worksheet()
    ws.delete_rows(row_num)


# ── Giving Accounts ──────────────────────────────────────────────────────────

GIVING_SHEET_NAME = "Giving"
GIVING_HEADERS = ["id", "label", "account_number", "bank_name", "active"]


def _get_giving_worksheet() -> gspread.Worksheet:
    spreadsheet = _get_spreadsheet()
    try:
        ws = spreadsheet.worksheet(GIVING_SHEET_NAME)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=GIVING_SHEET_NAME, rows=50, cols=len(GIVING_HEADERS))
        ws.append_row(GIVING_HEADERS)
    return ws


def get_all_giving_accounts(include_hidden: bool = False) -> List[dict]:
    ws = _get_giving_worksheet()
    records = ws.get_all_records(expected_headers=GIVING_HEADERS)
    result = []
    for i, row in enumerate(records, start=2):  # row 1 = headers
        if not include_hidden and str(row.get("active", "true")).lower() == "false":
            continue
        result.append({
            "id": str(row.get("id", "")),
            "label": row.get("label", ""),
            "account_number": str(row.get("account_number", "")),
            "bank_name": row.get("bank_name", "Access Bank"),
            "active": str(row.get("active", "true")).lower() != "false",
            "row_num": i,
        })
    return result


def add_giving_account(account_id: str, label: str, account_number: str, bank_name: str) -> None:
    ws = _get_giving_worksheet()
    ws.append_row([account_id, label, account_number, bank_name, "true"])


def update_giving_account(row_num: int, data: dict) -> None:
    ws = _get_giving_worksheet()
    ws.update(
        f"A{row_num}:E{row_num}",
        [[
            data["id"],
            data["label"],
            data["account_number"],
            data.get("bank_name", "Access Bank"),
            "true" if data.get("active", True) else "false",
        ]]
    )


def delete_giving_account(row_num: int) -> None:
    ws = _get_giving_worksheet()
    ws.delete_rows(row_num)


# ── Ezra Q&A ─────────────────────────────────────────────────────────────────

QA_SHEET_NAME = "Ezra Q&A"
QA_USABLE = {"confirmed", "already on site"}


def get_qa() -> List[dict]:
    """Q&A rows Ezra may answer from: only rows someone has confirmed."""
    try:
        records = _get_spreadsheet().worksheet(QA_SHEET_NAME).get_all_records()
    except gspread.WorksheetNotFound:
        return []
    return [
        {"question": str(r.get("question", "")), "answer": str(r.get("answer", ""))}
        for r in records
        if str(r.get("status", "")).strip().lower() in QA_USABLE and str(r.get("answer", "")).strip()
    ]


# ── Bookstore ────────────────────────────────────────────────────────────────

BOOKS_SHEET_NAME = "Books"
BOOKS_HEADERS = ["id", "title", "author", "price", "stock", "description", "front_image", "back_image", "active"]
ORDERS_SHEET_NAME = "Book Orders"
ORDERS_HEADERS = ["ref", "time", "name", "phone", "email", "items", "books_total", "charge", "total", "status"]


_worksheets = {}  # looked up once: every lookup is a call against Google's per-minute limit
_books = {"at": 0.0, "rows": None}


def _bookstore_worksheet(name: str, headers: List[str]) -> gspread.Worksheet:
    if name not in _worksheets:
        spreadsheet = _get_spreadsheet()
        try:
            _worksheets[name] = spreadsheet.worksheet(name)
        except gspread.WorksheetNotFound:
            _worksheets[name] = spreadsheet.add_worksheet(title=name, rows=1000, cols=len(headers))
            _worksheets[name].append_row(headers)
    return _worksheets[name]


def get_books() -> List[dict]:
    """The books on sale. Kept for 15 seconds, and dropped at once when a sale changes the stock."""
    if _books["rows"] is None or time.time() - _books["at"] > 15:
        _books.update(at=time.time(), rows=_read_books())
    return _books["rows"]


def _read_books() -> List[dict]:
    ws = _bookstore_worksheet(BOOKS_SHEET_NAME, BOOKS_HEADERS)
    records = ws.get_all_records(expected_headers=BOOKS_HEADERS)
    result = []
    for i, row in enumerate(records, start=2):  # row 1 = headers
        if str(row.get("active", "true")).lower() == "false":
            continue
        result.append({
            "id": str(row.get("id", "")),
            "title": str(row.get("title", "")),
            "author": str(row.get("author", "")),
            "price": int(row.get("price") or 0),
            "stock": int(row.get("stock") or 0),
            "description": str(row.get("description", "")),
            "front_image": str(row.get("front_image", "")),
            "back_image": str(row.get("back_image", "")),
            "row_num": i,
        })
    return result


def add_order(order: dict) -> None:
    ws = _bookstore_worksheet(ORDERS_SHEET_NAME, ORDERS_HEADERS)
    ws.append_row([order[h] for h in ORDERS_HEADERS])


def get_order(ref: str) -> Optional[dict]:
    ws = _bookstore_worksheet(ORDERS_SHEET_NAME, ORDERS_HEADERS)
    cell = ws.find(ref, in_column=1)
    if not cell:
        return None
    return {**dict(zip(ORDERS_HEADERS, ws.row_values(cell.row))), "row_num": cell.row}


def mark_paid(row_num: int, charge: int, total: int, status: str, stock: dict) -> None:
    """Write the paid order and the new stock in one request, so one can't be saved without the other.

    stock maps a Books row number to the copies left.
    """
    data = [{"range": f"'{ORDERS_SHEET_NAME}'!H{row_num}:J{row_num}", "values": [[charge, total, status]]}]
    data += [{"range": f"'{BOOKS_SHEET_NAME}'!E{r}", "values": [[left]]} for r, left in stock.items()]  # column E = stock
    _get_spreadsheet().values_batch_update({"valueInputOption": "RAW", "data": data})
    _books["rows"] = None


def get_paid_orders() -> List[dict]:
    """Paid orders for the admin book desk, newest first."""
    ws = _bookstore_worksheet(ORDERS_SHEET_NAME, ORDERS_HEADERS)
    rows = ws.get_all_records(expected_headers=ORDERS_HEADERS)
    return [r for r in reversed(rows) if str(r.get("status", "")).startswith("paid")]
