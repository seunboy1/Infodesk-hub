from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Cookie, Depends
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



def require_admin(infodesk_token: Optional[str] = Cookie(default=None)):
    if not infodesk_token or not verify_token(infodesk_token):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return True
