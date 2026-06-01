import json
import gspread
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


def _get_client() -> gspread.Client:
    creds_dict = json.loads(settings.google_service_account_json)
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    return gspread.authorize(creds)


def _get_worksheet() -> gspread.Worksheet:
    client = _get_client()
    spreadsheet = client.open_by_key(settings.google_sheet_id)
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
    ws.update(
        f"A{row_num}:G{row_num}",
        [[
            data["id"],
            data["name"],
            data["desc"],
            data["cat"],
            data["url"],
            data.get("qr_image") or "",
            "true" if data.get("active", True) else "false",
        ]]
    )


def update_qr_image(row_num: int, qr_url: str) -> None:
    ws = _get_worksheet()
    ws.update_cell(row_num, 6, qr_url)  # column F = qr_image


def delete_row(row_num: int) -> None:
    ws = _get_worksheet()
    ws.delete_rows(row_num)


# ── Announcements ─────────────────────────────────────────────────────────────

def _get_announcements_worksheet() -> gspread.Worksheet:
    client = _get_client()
    spreadsheet = client.open_by_key(settings.google_sheet_id)
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
    client = _get_client()
    spreadsheet = client.open_by_key(settings.google_sheet_id)
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
