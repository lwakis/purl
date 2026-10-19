"""React export endpoint tests (mock mode, deterministic)."""

from app.config import settings

_HTML = '<!DOCTYPE html><html><body><h1>Hi</h1></body></html>'


def test_export_react_mock_returns_component(client):
    resp = client.post('/api/export-react', json={'code': _HTML})
    assert resp.status_code == 200
    assert resp.headers['content-type'].startswith('application/json')

    body = resp.json()
    assert set(body) == {'code'}
    assert 'export default function App' in body['code']


def test_export_react_is_deterministic(client):
    payload = {'code': _HTML}
    first = client.post('/api/export-react', json=payload).json()['code']
    second = client.post('/api/export-react', json=payload).json()['code']
    assert first == second


def test_export_react_empty_code_returns_422(client):
    resp = client.post('/api/export-react', json={'code': ''})
    assert resp.status_code == 422


def test_export_react_too_long_code_returns_422(client):
    resp = client.post('/api/export-react', json={'code': 'a' * 200_001})
    assert resp.status_code == 422


def test_export_react_route_registered(client):
    paths = client.get('/openapi.json').json()['paths']
    assert '/api/export-react' in paths


def test_export_react_rate_limit_returns_429(client, monkeypatch):
    monkeypatch.setattr(settings, 'rate_limit_per_hour', 2)
    payload = {'code': _HTML}

    assert client.post('/api/export-react', json=payload).status_code == 200
    assert client.post('/api/export-react', json=payload).status_code == 200

    resp = client.post('/api/export-react', json=payload)
    assert resp.status_code == 429
    assert 'Retry-After' in resp.headers
    body = resp.json()
    assert body['detail'] == 'Rate limit exceeded. Try again later.'
    assert body['retry_after_seconds'] > 0


def test_export_react_provider_error_returns_502(client, monkeypatch):
    from app.services import export_react_service
    from app.services.llm_service import ProviderConfig

    ready = ProviderConfig(
        'openai', 'https://api.openai.com/v1', 'gpt-4o', 'openai', 'sk-test', True
    )
    monkeypatch.setattr(export_react_service, 'resolve_provider', lambda model=None: ready)

    async def _fake_stream(provider, system_prompt, user_message, *args, **kwargs):
        yield 'data: {"type": "error", "content": "llm_provider_error:401"}\n\n'

    monkeypatch.setattr(export_react_service, '_stream_llm', _fake_stream)

    resp = client.post('/api/export-react', json={'code': _HTML})
    assert resp.status_code == 502
    assert resp.json()['detail'] == 'llm_provider_error'
