from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Cookie, Request
import jwt
from typing import Optional
from config import get_settings

settings = get_settings()



def create_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    payload = {"sub": "admin", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> bool:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("sub") == "admin"
    except jwt.PyJWTError:
        return False



def require_admin(request: Request, infodesk_token: Optional[str] = Cookie(default=None)):
    # another website can make the browser send our cookie with a form post, but it can't fake the Origin header
    if request.method not in ("GET", "HEAD", "OPTIONS") and request.headers.get("origin") not in [
            u.strip() for u in settings.frontend_url.split(",")]:
        raise HTTPException(status_code=403, detail="Not allowed from this site")
    if not infodesk_token or not verify_token(infodesk_token):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return True
