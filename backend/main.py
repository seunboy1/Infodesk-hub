from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import links, admin
from config import get_settings

settings = get_settings()

app = FastAPI(
    title="Info Desk Hub API",
    description="Backend for CCI Info Desk Hub — link & QR code directory",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(links.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
