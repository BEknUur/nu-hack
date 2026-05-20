from __future__ import annotations

import httpx
from supabase_auth.errors import AuthApiError
from sqlalchemy.orm import Session

from core.supabase.client import supabase_client
from core.supabase.config import supabase_settings
from services.auth.models import User


def register_user(email: str, password: str, db: Session) -> dict:
    """
    Registers a new user via Supabase Auth sign_up.
    Requires email confirmation to be disabled in Supabase Dashboard
    (Authentication → Settings → Enable email confirmations = OFF).
    """
    try:
        response = supabase_client.auth.sign_up({
            "email": email,
            "password": password,
        })
    except AuthApiError as e:
        raise ValueError(e.message)

    user = response.user
    session = response.session

    if not user:
        raise ValueError("Registration failed")

    if not session:
        raise ValueError(
            "Email confirmation is required. "
            "Please disable it in Supabase Dashboard → Authentication → Settings."
        )

    # Create User in our DB if not exists
    existing = db.query(User).filter(User.supabase_user_id == str(user.id)).first()
    if not existing:
        new_user = User(supabase_user_id=str(user.id), email=email)
        db.add(new_user)
        db.commit()

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "user_id": str(user.id),
        "email": email,
    }


def login_user(email: str, password: str, db: Session) -> dict:
    """
    Signs in via Supabase Auth and ensures User record exists in our DB.
    """
    try:
        response = supabase_client.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
    except AuthApiError as e:
        raise ValueError(e.message)

    user = response.user
    session = response.session
    if not user or not session:
        raise ValueError("Login failed")

    # Ensure User exists in our DB
    existing = db.query(User).filter(User.supabase_user_id == str(user.id)).first()
    if not existing:
        new_user = User(supabase_user_id=str(user.id), email=email)
        db.add(new_user)
        db.commit()

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "user_id": str(user.id),
        "email": email,
    }


def refresh_user_token(refresh_token: str) -> dict:
    """
    Exchanges a refresh token for a new access token.
    """
    try:
        response = supabase_client.auth.refresh_session(refresh_token)
    except AuthApiError as e:
        raise ValueError(e.message)

    session = response.session
    user = response.user
    if not session or not user:
        raise ValueError("Token refresh failed")

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "user_id": str(user.id),
        "email": user.email or "",
    }


async def logout_user(access_token: str) -> None:
    """
    Revokes the Supabase session via REST API.
    """
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{supabase_settings.url}/auth/v1/logout",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": supabase_settings.anon_key,
            },
        )
