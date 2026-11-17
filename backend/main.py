import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import links, admin, bookstore
from config import get_settings

settings = get_settings()

app = FastAPI(
    title="Info Desk Hub API",
    description="Backend for CCI Info Desk Hub — link & QR code directory",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[u.strip() for u in settings.frontend_url.split(",")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(links.router)
app.include_router(admin.router)
app.include_router(bookstore.router)


@app.middleware("http")
async def refresh_site(request: Request, call_next):
    """After an admin save, ask the site to rebuild its saved pages so the change shows at once."""
    response = await call_next(request)
    if (settings.revalidate_secret and request.url.path.startswith("/admin/")
            and request.method in ("POST", "PUT", "DELETE") and response.status_code < 400
            and request.url.path not in ("/admin/login", "/admin/logout")):
        site = settings.frontend_url.split(",")[0].strip()
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(f"{site}/api/revalidate", headers={"x-revalidate-secret": settings.revalidate_secret})
        except httpx.HTTPError:
            pass  # the page still refreshes by itself within five minutes
    return response


@app.get("/health")
def health():
    return {"status": "ok"}
