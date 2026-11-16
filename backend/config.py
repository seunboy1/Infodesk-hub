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

    # CORS (comma-separated to allow more than one site)
    frontend_url: str = "http://localhost:3000"

    # Ezra chat: models are tried in this order; a provider with no key is skipped
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"
    cloudflare_account_id: str = ""
    cloudflare_api_token: str = ""
    cloudflare_model: str = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    openrouter_api_key: str = ""
    openrouter_model: str = "qwen/qwen3.7-flash"

    # Security
    secure_cookies: bool = False  # Set True in production (HTTPS)

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
