"""Health-check endpoint tests."""


def test_root_returns_ok(client):
    resp = client.get('/')
    assert resp.status_code == 200
    assert resp.json()['status'] == 'ok'


def test_health_returns_healthy(client):
    resp = client.get('/health')
    assert resp.status_code == 200
    assert resp.json()['status'] == 'healthy'
