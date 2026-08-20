"""Generation and iteration endpoint tests (mock mode)."""

from helpers import extract_complete_html, parse_sse

from app.config import settings


def test_generate_streams_all_events(client):
    resp = client.post('/api/generate', json={'prompt': 'Создай лендинг для SaaS-продукта'})
    assert resp.status_code == 200
    assert resp.headers['content-type'].startswith('text/event-stream')

    events = parse_sse(resp.text)
    event_types = [e['type'] for e in events]
    assert 'analysis' in event_types
    assert 'design' in event_types
    assert 'code' in event_types
    assert 'complete' in event_types

    html = extract_complete_html(resp.text)
    assert html.startswith('<!DOCTYPE html>')


def test_generate_second_identical_call_served_from_cache(client):
    payload = {'prompt': 'Дашборд аналитики', 'theme': 'dark', 'style': 'techno'}

    first = client.post('/api/generate', json=payload)
    assert first.status_code == 200
    first_html = extract_complete_html(first.text)

    second = client.post('/api/generate', json=payload)
    assert second.status_code == 200
    events = parse_sse(second.text)
    assert [e['type'] for e in events] == ['analysis', 'complete']
    assert extract_complete_html(second.text) == first_html


def test_generate_rate_limit_returns_429(client, monkeypatch):
    monkeypatch.setattr(settings, 'rate_limit_per_hour', 2)
    payload = {'prompt': 'Портфолио'}

    assert client.post('/api/generate', json=payload).status_code == 200
    assert client.post('/api/generate', json=payload).status_code == 200

    resp = client.post('/api/generate', json=payload)
    assert resp.status_code == 429
    assert 'Retry-After' in resp.headers


def test_iterate_streams_complete_with_message(client):
    current_code = '<!DOCTYPE html>\n<html><body><h1>Hello</h1></body></html>'
    message = 'Сделай кнопку красной'
    resp = client.post(
        '/api/iterate',
        json={'message': message, 'current_code': current_code},
    )
    assert resp.status_code == 200
    assert resp.headers['content-type'].startswith('text/event-stream')

    events = parse_sse(resp.text)
    assert 'complete' in [e['type'] for e in events]

    html = extract_complete_html(resp.text)
    assert message in html
    assert '<!-- Iteration' in html
