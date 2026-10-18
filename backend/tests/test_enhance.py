"""Prompt enhancement endpoint tests (mock mode, deterministic)."""

from app.config import settings


def test_enhance_mock_ru_keeps_original_and_enriches(client):
    prompt = 'Создай лендинг для SaaS-продукта'
    resp = client.post('/api/enhance-prompt', json={'prompt': prompt})
    assert resp.status_code == 200
    assert resp.headers['content-type'].startswith('application/json')

    body = resp.json()
    assert set(body) == {'prompt'}
    enhanced = body['prompt']
    assert prompt in enhanced
    assert len(enhanced) > len(prompt)


def test_enhance_mock_en_keeps_original_and_enriches(client):
    prompt = 'Landing page for a coffee shop'
    resp = client.post('/api/enhance-prompt', json={'prompt': prompt})
    assert resp.status_code == 200

    enhanced = resp.json()['prompt']
    assert prompt in enhanced
    assert len(enhanced) > len(prompt)


def test_enhance_is_deterministic(client):
    prompt = 'Дашборд аналитики'
    first = client.post('/api/enhance-prompt', json={'prompt': prompt}).json()['prompt']
    second = client.post('/api/enhance-prompt', json={'prompt': prompt}).json()['prompt']
    assert first == second


def test_enhance_result_within_max_length(client):
    prompt = 'Портфолио фотографа'
    enhanced = client.post('/api/enhance-prompt', json={'prompt': prompt}).json()['prompt']
    assert len(enhanced) <= settings.max_prompt_length


def test_enhance_empty_prompt_returns_422(client):
    resp = client.post('/api/enhance-prompt', json={'prompt': ''})
    assert resp.status_code == 422


def test_enhance_too_long_prompt_returns_422(client):
    resp = client.post('/api/enhance-prompt', json={'prompt': 'a' * 2001})
    assert resp.status_code == 422


def test_enhance_route_registered(client):
    paths = client.get('/openapi.json').json()['paths']
    assert '/api/enhance-prompt' in paths


def test_enhance_rate_limit_returns_429(client, monkeypatch):
    monkeypatch.setattr(settings, 'rate_limit_per_hour', 2)
    payload = {'prompt': 'Портфолио'}

    assert client.post('/api/enhance-prompt', json=payload).status_code == 200
    assert client.post('/api/enhance-prompt', json=payload).status_code == 200

    resp = client.post('/api/enhance-prompt', json=payload)
    assert resp.status_code == 429
    assert 'Retry-After' in resp.headers
    body = resp.json()
    assert body['detail'] == 'Rate limit exceeded. Try again later.'
    assert body['retry_after_seconds'] > 0
