"""Prompt template endpoint tests."""

from app.routers.templates import _TEMPLATES_CACHE_KEY
from app.services.cache_service import cache


def test_templates_returns_eight_seeded(client):
    resp = client.get('/api/templates')
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) == 8
    for template in templates:
        assert template['title']
        assert template['prompt_text']


def test_templates_second_request_served_from_cache(client):
    first = client.get('/api/templates')
    assert first.status_code == 200
    assert cache.get(_TEMPLATES_CACHE_KEY) is not None
    second = client.get('/api/templates')
    assert second.status_code == 200
    assert second.json() == first.json()
