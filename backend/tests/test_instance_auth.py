"""Instance token authentication tests."""

from app.config import settings

TOKEN = 'secret-token'


def test_instance_is_public_without_token(client):
    resp = client.get('/api/instance')
    assert resp.status_code == 200
    body = resp.json()
    assert body['auth_required'] is False
    assert body['authenticated'] is True


def test_api_is_open_without_token(client):
    resp = client.get('/api/projects')
    assert resp.status_code == 200


def test_api_requires_token(client, monkeypatch):
    monkeypatch.setattr(settings, 'instance_token', TOKEN)

    resp = client.get('/api/projects')
    assert resp.status_code == 401
    assert resp.headers['WWW-Authenticate'] == 'Bearer'
    assert resp.json() == {'detail': 'Instance token required'}


def test_api_rejects_wrong_token(client, monkeypatch):
    monkeypatch.setattr(settings, 'instance_token', TOKEN)

    resp = client.get('/api/projects', headers={'Authorization': 'Bearer wrong-token'})
    assert resp.status_code == 401


def test_api_accepts_valid_token(client, monkeypatch):
    monkeypatch.setattr(settings, 'instance_token', TOKEN)

    resp = client.get('/api/projects', headers={'Authorization': f'Bearer {TOKEN}'})
    assert resp.status_code == 200


def test_api_accepts_lowercase_scheme(client, monkeypatch):
    monkeypatch.setattr(settings, 'instance_token', TOKEN)

    resp = client.get('/api/projects', headers={'Authorization': f'bearer {TOKEN}'})
    assert resp.status_code == 200


def test_instance_reports_auth_state(client, monkeypatch):
    monkeypatch.setattr(settings, 'instance_token', TOKEN)

    anonymous = client.get('/api/instance')
    assert anonymous.status_code == 200
    assert anonymous.json()['auth_required'] is True
    assert anonymous.json()['authenticated'] is False

    authenticated = client.get('/api/instance', headers={'Authorization': f'Bearer {TOKEN}'})
    assert authenticated.status_code == 200
    assert authenticated.json()['authenticated'] is True

    wrong = client.get('/api/instance', headers={'Authorization': 'Bearer nope'})
    assert wrong.status_code == 200
    assert wrong.json()['authenticated'] is False


def test_health_stays_public_with_token(client, monkeypatch):
    monkeypatch.setattr(settings, 'instance_token', TOKEN)

    resp = client.get('/health')
    assert resp.status_code == 200


def test_cors_preflight_is_not_blocked(client, monkeypatch):
    monkeypatch.setattr(settings, 'instance_token', TOKEN)

    resp = client.options(
        '/api/projects',
        headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'GET',
        },
    )
    assert resp.status_code != 401
