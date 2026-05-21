from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.routing import APIRouter
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from starlette.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST

from core.auth.dependencies import get_current_user
from core.database.session.database import get_db
from services.auth.models import User
from services.auth.service import login_user, logout_user, refresh_user_token, register_user

from .schemas import AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, UserMeResponse

router = APIRouter(prefix="/auth", tags=["auth"])

bearer_scheme = HTTPBearer()


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=HTTP_201_CREATED,
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        result = register_user(email=payload.email, password=payload.password, db=db)
    except ValueError as e:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))
    return AuthResponse(**result)


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=HTTP_200_OK,
)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        result = login_user(email=payload.email, password=payload.password, db=db)
    except ValueError as e:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))
    return AuthResponse(**result)


@router.post(
    "/refresh",
    response_model=AuthResponse,
    status_code=HTTP_200_OK,
)
def refresh(payload: RefreshRequest) -> AuthResponse:
    try:
        result = refresh_user_token(refresh_token=payload.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))
    return AuthResponse(**result)


@router.post(
    "/logout",
    status_code=HTTP_200_OK,
)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    current_user: dict = Depends(get_current_user),
) -> dict:
    await logout_user(access_token=credentials.credentials)
    return {"message": "Logged out successfully"}


@router.get(
    "/me",
    response_model=UserMeResponse,
    status_code=HTTP_200_OK,
)
def me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserMeResponse:
    supabase_user_id = current_user["sub"]
    user = db.query(User).filter(User.supabase_user_id == supabase_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserMeResponse(
        id=user.id,
        supabase_user_id=user.supabase_user_id,
        email=user.email,
        created_at=user.created_at,
    )
