"""Purl AI Backend — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db, init_db

# ── Routers ──────────────────────────────────────────────────────────────────
from app.routers import enhance, export_react, generate, projects
from app.services.llm_service import close_llm_client, resolve_provider


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup, clean up on shutdown."""
    await init_db()
    yield
    await close_llm_client()


app = FastAPI(
    title='Purl AI',
    description='AI-powered design generation service',
    version='0.7.0',
    lifespan=lifespan,
    redirect_slashes=False,
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

app.include_router(enhance.router)
app.include_router(export_react.router)
app.include_router(generate.router)
app.include_router(projects.router)


# ── Root health-check ────────────────────────────────────────────────────────


@app.get('/')
async def root():
    return {'status': 'ok', 'version': '0.7.0'}


@app.get('/health')
async def health(db: AsyncSession = Depends(get_db)):  # noqa: B008
    """Liveness/readiness probe used by the docker-compose healthcheck.

    Always answers HTTP 200: a database failure downgrades the status to
    ``degraded`` (``database: "error"``) rather than failing the probe.
    """
    database = 'ok'
    status = 'healthy'
    try:
        await db.execute(text('SELECT 1'))
    except Exception:
        database = 'error'
        status = 'degraded'

    provider = resolve_provider(None)

    return {
        'status': status,
        'version': app.version,
        'database': database,
        'mock_mode': not provider.ready,
        'provider': provider.name if provider.ready else None,
    }
