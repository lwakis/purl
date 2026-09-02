"""Shared pytest fixtures and environment setup for the Purl AI backend."""

import os
import sys
import tempfile
import uuid

# Make the backend package importable regardless of the installed environment.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Environment setup — MUST happen before importing anything from app ───────
# OS environment variables take precedence over .env in pydantic-settings,
# so these overrides guarantee tests never touch the real database or API.
_TMPDIR = tempfile.mkdtemp(prefix='purl-test-')
os.environ['DATABASE_URL'] = f'sqlite+aiosqlite:///{_TMPDIR}/test.db'
os.environ['LLM_API_KEY'] = ''

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.services.cache_service import cache  # noqa: E402
from app.services.rate_limiter import rate_limiter  # noqa: E402
from app.services.token_usage import usage_store  # noqa: E402

# ── Sanity checks ────────────────────────────────────────────────────────────
assert _TMPDIR in settings.database_url, (
    f'settings.database_url={settings.database_url!r} does not point to the test DB'
)
assert settings.llm_api_key == '', 'LLM_API_KEY must be empty in tests'


@pytest.fixture(autouse=True)
def _clear_singletons():
    """Reset shared in-memory singletons before each test."""
    rate_limiter._buckets.clear()
    cache._data.clear()
    usage_store._by_session.clear()
    yield


@pytest.fixture(scope='session')
def client():
    """Session-scoped TestClient; the context manager runs the app lifespan."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def create_project(client):
    """Create a project via the API and return its JSON response."""

    def _create(**overrides):
        payload = {
            'name': 'Test Project',
            'prompt': 'A landing page',
            'current_code': '<!DOCTYPE html><html><body></body></html>',
            'session_id': f'ses-{uuid.uuid4().hex[:8]}',
        }
        payload.update(overrides)
        resp = client.post('/api/projects', json=payload)
        assert resp.status_code == 201, resp.text
        return resp.json()

    return _create
