from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Google Sheets
    google_sheet_id: str
    google_service_account_json: str  # full JSON string

    # Admin auth
    admin_password: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 8

    # Cloudinary (for QR image uploads)
    cloudinary_url: str = ""

    # CORS
    frontend_url: str = "http://localhost:3000"

    # Security
    secure_cookies: bool = False  # Set True in production (HTTPS)

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
