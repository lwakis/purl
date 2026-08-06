"""Simplified authentication endpoints for the Purl MVP.

Supports anonymous sessions (JWT-based) and email registration/login.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import User, get_db
from app.models import AnonAuthResponse, AuthResponse, LoginRequest, RegisterRequest
from app.utils import generate_session_id

router = APIRouter(prefix='/api/auth', tags=['auth'])


def _hash_password(password: str) -> str:
    """Simple SHA-256 password hashing (MVP — use bcrypt/argon2 in production)."""
    return hashlib.sha256(password.encode()).hexdigest()


def _create_token(payload: dict[str, str | datetime]) -> str:
    """Create a signed JWT token."""
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _create_anon_token(session_id: str) -> str:
    """Create a token for anonymous sessions."""
    payload = {
        'sub': session_id,
        'type': 'anon',
        'exp': datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return _create_token(payload)


def _create_user_token(user_id: int, email: str) -> str:
    """Create a token for registered users."""
    payload = {
        'sub': str(user_id),
        'email': email,
        'type': 'user',
        'exp': datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return _create_token(payload)


@router.post('/anon', response_model=AnonAuthResponse)
async def create_anon_session():
    """Create an anonymous session with a JWT token."""
    session_id = generate_session_id()
    token = _create_anon_token(session_id)
    return AnonAuthResponse(session_id=session_id, token=token)


@router.post('/register', response_model=AuthResponse, status_code=201)
async def register(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Register a new user with email and password."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == req.email))
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail='Email already registered')

    user = User(
        email=req.email,
        name=req.name or req.email.split('@')[0],
        auth_provider='email',
        password_hash=_hash_password(req.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = _create_user_token(user.id, user.email)
    return AuthResponse(
        user_id=user.id,
        email=user.email,
        name=user.name,
        token=token,
    )


@router.post('/login', response_model=AuthResponse)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Authenticate with email and password."""
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if user is None or user.password_hash != _hash_password(req.password):
        raise HTTPException(status_code=401, detail='Invalid email or password')

    token = _create_user_token(user.id, user.email)
    return AuthResponse(
        user_id=user.id,
        email=user.email,
        name=user.name,
        token=token,
    )
