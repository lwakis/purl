"""Tests for the POST /api/models/test provider connection probe."""

from __future__ import annotations

import asyncio

from app.config import settings
from app.services.llm_service import ProviderConfig


def _ready_provider() -> ProviderConfig:
    return ProviderConfig(
        'openai', 'https://api.openai.com/v1', 'gpt-4o', 'openai', 'sk-test', True
    )


def test_models_test_mock_mode(client):
    resp = client.post('/api/models/test', json={})
    assert resp.status_code == 200
    assert resp.json() == {'ok': True, 'reason': 'mock', 'provider': None, 'model': None}


def test_models_test_success(client, monkeypatch):
    from app.routers import generate

    monkeypatch.setattr(generate, 'resolve_provider', lambda model=None: _ready_provider())

    async def _fake_stream(provider, system_prompt, user_message, *args, **kwargs):
        yield 'data: {"type": "code", "content": "OK"}\n\n'

    monkeypatch.setattr(generate, '_stream_llm', _fake_stream)

    resp = client.post('/api/models/test', json={})
    assert resp.status_code == 200
    body = resp.json()
    assert body['ok'] is True
    assert body['reason'] == 'ok'
    assert body['provider'] == 'openai'
    assert body['model'] == 'gpt-4o'


def test_models_test_raising_provider_reports_failure(client, monkeypatch):
    from app.routers import generate

    monkeypatch.setattr(generate, 'resolve_provider', lambda model=None: _ready_provider())

    async def _boom(provider, system_prompt, user_message, *args, **kwargs):
        raise RuntimeError('connection refused')
        yield  # pragma: no cover

    monkeypatch.setattr(generate, '_stream_llm', _boom)

    resp = client.post('/api/models/test', json={})
    assert resp.status_code == 200
    body = resp.json()
    assert body['ok'] is False
    assert body['reason'] == 'error'
    assert body['provider'] == 'openai'
    assert body['model'] == 'gpt-4o'


def test_models_test_error_event_reports_failure(client, monkeypatch):
    from app.routers import generate

    monkeypatch.setattr(generate, 'resolve_provider', lambda model=None: _ready_provider())

    async def _fake_stream(provider, system_prompt, user_message, *args, **kwargs):
        yield 'data: {"type": "error", "content": "llm_provider_error:401"}\n\n'

    monkeypatch.setattr(generate, '_stream_llm', _fake_stream)

    resp = client.post('/api/models/test', json={})
    assert resp.status_code == 200
    body = resp.json()
    assert body['ok'] is False
    assert body['reason'] == 'error'


def test_models_test_timeout_reports_failure(client, monkeypatch):
    from app.routers import generate

    monkeypatch.setattr(generate, 'resolve_provider', lambda model=None: _ready_provider())
    monkeypatch.setattr(generate, '_TEST_TIMEOUT_SECONDS', 0.01)

    async def _slow_stream(provider, system_prompt, user_message, *args, **kwargs):
        await asyncio.sleep(0.2)
        yield 'data: {"type": "code", "content": "OK"}\n\n'

    monkeypatch.setattr(generate, '_stream_llm', _slow_stream)

    resp = client.post('/api/models/test', json={})
    assert resp.status_code == 200
    body = resp.json()
    assert body['ok'] is False
    assert body['reason'] == 'error'


def test_models_test_rate_limit_returns_429(client, monkeypatch):
    monkeypatch.setattr(settings, 'rate_limit_per_hour', 2)

    assert client.post('/api/models/test', json={}).status_code == 200
    assert client.post('/api/models/test', json={}).status_code == 200

    resp = client.post('/api/models/test', json={})
    assert resp.status_code == 429
    assert 'Retry-After' in resp.headers
    assert resp.json()['detail'] == 'Rate limit exceeded. Try again later.'
