"""Persistent result-cache tests: SQLite durability, expiry, and degradation."""

import time

from helpers import extract_complete_html, parse_sse

from app.database import CacheEntry, async_session_factory
from app.services.cache_service import cache


def test_cache_persists_across_memory_clear(client):
    """A generated result must be served from the DB after memory is dropped."""
    payload = {'prompt': 'Persistent cache proof', 'theme': 'dark', 'style': 'techno'}

    first = client.post('/api/generate', json=payload)
    assert first.status_code == 200
    first_html = extract_complete_html(first.text)

    # Simulate a server restart: drop only the in-memory layer.
    cache._data.clear()

    second = client.post('/api/generate', json=payload)
    assert second.status_code == 200
    events = parse_sse(second.text)
    assert [e['type'] for e in events] == ['analysis', 'complete']
    assert events[0]['content'] == 'load_from_cache'
    assert extract_complete_html(second.text) == first_html


async def test_expired_db_row_is_a_miss_and_removed(client):
    """Rows past their expiry are not returned and are deleted on access."""
    key = 'expired-row-test'
    now = time.time()
    async with async_session_factory() as session:
        session.add(CacheEntry(key=key, value='stale', expires_at=now - 10, created_at=now - 20))
        await session.commit()

    cache._data.clear()  # force the DB path

    assert await cache.aget(key) is None

    async with async_session_factory() as session:
        assert await session.get(CacheEntry, key) is None


def test_generate_survives_db_failure(client, monkeypatch):
    """When the DB is down, generation still completes via memory-only caching."""
    import app.database as db

    def _boom(*args, **kwargs):
        raise RuntimeError('database unavailable')

    monkeypatch.setattr(db, 'async_session_factory', _boom)

    payload = {'prompt': 'DB failure resilience', 'theme': 'dark', 'style': 'minimal'}
    resp = client.post('/api/generate', json=payload)
    assert resp.status_code == 200

    events = parse_sse(resp.text)
    assert 'complete' in [e['type'] for e in events]
    assert extract_complete_html(resp.text).startswith('<!DOCTYPE html>')
