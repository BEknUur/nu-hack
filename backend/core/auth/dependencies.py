import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.status import HTTP_401_UNAUTHORIZED

from core.supabase.config import supabase_settings

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Validates token by calling Supabase /auth/v1/user.
    Returns: { sub, email, role }
    """
    token = credentials.credentials
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{supabase_settings.url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": supabase_settings.anon_key,
            },
        )

    if res.status_code != 200:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    data = res.json()
    return {
        "sub": data["id"],
        "email": data.get("email", ""),
        "role": data.get("role", "authenticated"),
    }
