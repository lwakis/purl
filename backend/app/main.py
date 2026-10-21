"""Purl AI Backend — FastAPI application entry point."""

from __future__ import annotations

import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
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

# Built frontend assets shipped inside the all-in-one Docker image. In local
# development the directory is absent and the API-only behaviour is unchanged.
_STATIC_DIR = Path(__file__).resolve().parent.parent / 'static'

# ── Instance token authentication ────────────────────────────────────────────


def _presented_token(request: Request) -> str:
    """Return the bearer token from the Authorization header, or ''."""
    scheme, _, token = request.headers.get('Authorization', '').partition(' ')
    if scheme.lower() != 'bearer':
        return ''
    return token.strip()


def _token_ok(request: Request) -> bool:
    """Whether the request carries the configured instance token."""
    return bool(settings.instance_token) and secrets.compare_digest(
        _presented_token(request), settings.instance_token
    )


@app.middleware('http')
async def require_instance_token(request: Request, call_next):
    """Gate ``/api`` routes behind the optional instance token.

    Public endpoints (``/health``, ``/api/instance``) and CORS preflight
    requests stay reachable. When no token is configured everything is open.
    """
    if not settings.instance_token:
        return await call_next(request)

    path = request.url.path
    is_api = path == '/api' or path.startswith('/api/')

    if request.method == 'OPTIONS' or not is_api or path == '/api/instance':
        return await call_next(request)

    if not _token_ok(request):
        return JSONResponse(
            status_code=401,
            content={'detail': 'Instance token required'},
            headers={'WWW-Authenticate': 'Bearer'},
        )

    return await call_next(request)


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


# ── Public instance info ─────────────────────────────────────────────────────


@app.get('/api/instance')
async def instance_info(request: Request):
    """Public bootstrap endpoint describing whether a token is required."""
    return {
        'auth_required': bool(settings.instance_token),
        'authenticated': (not settings.instance_token) or _token_ok(request),
        'version': app.version,
    }


# ── Root health-check ────────────────────────────────────────────────────────


if not _STATIC_DIR.is_dir():

    @app.get('/')
    async def root():
        return {'status': 'ok', 'version': app.version}


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


# Serve the built SPA last so every API route matches first. The all-in-one
# Docker image copies the frontend build into `backend/../static`.
if _STATIC_DIR.is_dir():
    app.mount('/', StaticFiles(directory=_STATIC_DIR, html=True), name='static')
