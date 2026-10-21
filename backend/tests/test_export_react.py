"""React export endpoint tests (Vite project zip, mock mode, deterministic)."""

import io
import json
import zipfile

from app.config import settings

_HTML = '<!DOCTYPE html><html><body><h1>Hi</h1></body></html>'
_TITLED_HTML = (
    '<!DOCTYPE html><html><head><title>My Café</title></head><body><p>x</p></body></html>'
)


def _open_zip(resp) -> zipfile.ZipFile:
    return zipfile.ZipFile(io.BytesIO(resp.content))


def _read(zf: zipfile.ZipFile, name: str) -> str:
    return zf.read(name).decode('utf-8')


def test_export_react_returns_zip(client):
    resp = client.post('/api/export-react', json={'code': _HTML})
    assert resp.status_code == 200
    assert resp.headers['content-type'].startswith('application/zip')
    assert 'react-project.zip' in resp.headers['content-disposition']


def test_export_react_zip_contains_project_files(client):
    resp = client.post('/api/export-react', json={'code': _HTML})
    with _open_zip(resp) as zf:
        names = zf.namelist()

    assert 'package.json' in names
    assert 'index.html' in names
    assert 'vite.config.js' in names
    assert 'README.md' in names
    assert '.gitignore' in names
    assert 'src/main.jsx' in names
    assert 'src/App.jsx' in names
    # No top-level folder wrapper.
    assert all(not name.startswith('/') for name in names)


def test_export_react_package_json_is_valid(client):
    resp = client.post('/api/export-react', json={'code': _HTML})
    with _open_zip(resp) as zf:
        package = json.loads(_read(zf, 'package.json'))

    assert package['scripts']['dev'] == 'vite'
    assert package['scripts']['build'] == 'vite build'
    assert 'react' in package['dependencies']
    assert 'react-dom' in package['dependencies']
    assert 'vite' in package['devDependencies']
    assert '@vitejs/plugin-react' in package['devDependencies']


def test_export_react_app_component_embeds_html(client):
    resp = client.post('/api/export-react', json={'code': _HTML})
    with _open_zip(resp) as zf:
        app = _read(zf, 'src/App.jsx')

    assert 'export default function App' in app
    assert '<h1>Hi</h1>' in app


def test_export_react_index_html_uses_page_title(client):
    resp = client.post('/api/export-react', json={'code': _TITLED_HTML})
    with _open_zip(resp) as zf:
        index = _read(zf, 'index.html')

    assert 'My Café' in index
    assert '<div id="root"></div>' in index
    assert '/src/main.jsx' in index


def test_export_react_index_html_falls_back_to_default_title(client):
    resp = client.post('/api/export-react', json={'code': _HTML})
    with _open_zip(resp) as zf:
        index = _read(zf, 'index.html')

    assert 'Purl React export' in index


def test_export_react_is_deterministic(client):
    payload = {'code': _HTML}
    first = client.post('/api/export-react', json=payload).content
    second = client.post('/api/export-react', json=payload).content
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
    from app.services import export_react_service, llm_service
    from app.services.llm_service import ProviderConfig

    ready = ProviderConfig(
        'openai', 'https://api.openai.com/v1', 'gpt-4o', 'openai', 'sk-test', True
    )
    monkeypatch.setattr(export_react_service, 'resolve_provider', lambda model=None: ready)
    monkeypatch.setattr(settings, 'llm_fallback_model', '')

    async def _fake_stream(provider, system_prompt, user_message, *args, **kwargs):
        yield 'data: {"type": "error", "content": "llm_provider_error:401"}\n\n'

    monkeypatch.setattr(llm_service, '_stream_llm', _fake_stream)

    resp = client.post('/api/export-react', json={'code': _HTML})
    assert resp.status_code == 502
    assert resp.json()['detail'] == 'llm_provider_error'
