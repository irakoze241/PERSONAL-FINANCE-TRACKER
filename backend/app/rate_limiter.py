from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request


def get_user_id(request: Request) -> str:
    """
    Rate limit key: use authenticated user_id when available,
    fall back to IP address for unauthenticated routes.
    """
    # Try to extract user_id from JWT without verifying (for key purposes only)
    auth: str = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        try:
            from jose import jwt
            from app.config import settings
            payload = jwt.decode(
                token,
                settings.secret_key,
                algorithms=[settings.algorithm],
                options={"verify_exp": False},
            )
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    return get_remote_address(request)


# Global limiter instance — uses per-user key
limiter = Limiter(key_func=get_user_id, default_limits=["60/minute"])
