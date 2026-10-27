"""Health-check endpoint tests."""

from app.config import settings
from app.main import app


def test_root_returns_ok(client):
    resp = client.get('/')
    assert resp.status_code == 200
    assert resp.json()['status'] == 'ok'


def test_health_returns_healthy(client):
    resp = client.get('/health')
    assert resp.status_code == 200
    assert resp.json()['status'] == 'healthy'


def test_health_reports_full_status(client):
    resp = client.get('/health')
    assert resp.status_code == 200

    body = resp.json()
    assert body['status'] == 'healthy'
    assert body['version'] == app.version
    assert body['database'] == 'ok'
    assert body['mock_mode'] is True
    assert body['provider'] is None


def test_health_uses_configured_provider_specific_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'deepseek')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    monkeypatch.setattr(settings, 'deepseek_api_key', 'sk-test')

    body = client.get('/health').json()
    assert body['mock_mode'] is False
    assert body['provider'] == 'deepseek'


def test_health_ignores_another_provider_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'deepseek')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    monkeypatch.setattr(settings, 'deepseek_api_key', '')
    monkeypatch.setattr(settings, 'openai_api_key', 'sk-test')

    body = client.get('/health').json()
    assert body['mock_mode'] is True
    assert body['provider'] is None
