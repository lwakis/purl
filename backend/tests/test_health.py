"""Health-check endpoint tests."""

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
