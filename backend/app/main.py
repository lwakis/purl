"""Purl AI Backend — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db

# ── Routers ──────────────────────────────────────────────────────────────────
from app.routers import auth, generate, projects, share, templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup, clean up on shutdown."""
    await init_db()
    yield


app = FastAPI(
    title='Purl AI',
    description='AI-powered design generation service',
    version='0.1.0',
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── Register routers ─────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(generate.router)
app.include_router(projects.router)
app.include_router(share.router)
app.include_router(templates.router)


# ── Root health-check ────────────────────────────────────────────────────────


@app.get('/')
async def root():
    return {'status': 'ok', 'version': '0.1.0'}


@app.get('/health')
async def health():
    return {'status': 'healthy'}
