"""Cache with TTL for generated HTML designs.

Two layers: a fast in-memory ``OrderedDict`` (LRU + TTL) and a persistent
SQLite-backed layer (``cache_entries``) so generated HTML survives restarts.
The synchronous API used by the template list is unchanged; the ``a*`` async
methods add persistence while always degrading to memory-only on DB failure.
"""

from __future__ import annotations

import time
from collections import OrderedDict

from app.config import settings
from app.utils import hash_prompt


class TTLCache:
    """Thread-safe-ish in-memory cache with TTL eviction via ``OrderedDict``."""

    def __init__(self, default_ttl: int = 86_400) -> None:
        self._data: OrderedDict[str, tuple[float, str]] = OrderedDict()
        self._default_ttl = default_ttl

    def _evict_expired(self) -> None:
        """Remove all expired entries."""
        now = time.time()
        expired_keys = [k for k, (exp, _) in self._data.items() if exp <= now]
        for k in expired_keys:
            del self._data[k]

    def get(self, key: str) -> str | None:
        """Return cached value or ``None`` if missing / expired."""
        self._evict_expired()
        entry = self._data.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at <= time.time():
            del self._data[key]
            return None
        return value

    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        """Store *value* with optional *ttl* (seconds)."""
        ttl = ttl or self._default_ttl
        expires_at = time.time() + ttl
        self._data[key] = (expires_at, value)
        # Basic memory safeguard — keep at most 500 entries
        if len(self._data) > 500:
            self._data.popitem(last=False)

    def get_cached(
        self,
        prompt: str,
        theme: str,
        style: str,
        model: str | None = None,
        plan: bool = False,
    ) -> str | None:
        """Convenience: hash prompt+theme+style+model+plan and return cached HTML if any."""
        key = hash_prompt(prompt, theme, style, model or '', plan)
        return self.get(key)

    def set_cache(
        self,
        prompt: str,
        theme: str,
        style: str,
        html: str,
        model: str | None = None,
        plan: bool = False,
        ttl: int | None = None,
    ) -> None:
        """Convenience: hash prompt+theme+style+model+plan and cache the HTML."""
        key = hash_prompt(prompt, theme, style, model or '', plan)
        self.set(key, html, ttl)

    # ── Persistent (SQLite-backed) async layer ───────────────────────────────
    # Any database failure is swallowed: the cache must never break generation.

    async def aget(self, key: str) -> str | None:
        """Return cached value from memory, else the DB, else ``None``."""
        value = self.get(key)
        if value is not None:
            return value

        try:
            from app.database import CacheEntry, async_session_factory

            async with async_session_factory() as session:
                row = await session.get(CacheEntry, key)
                if row is None:
                    return None
                if row.expires_at <= time.time():
                    await session.delete(row)
                    await session.commit()
                    return None
                value = row.value
                expires_at = row.expires_at
        except Exception:
            # DB unavailable — fall back to memory-only.
            return None

        # Rehydrate memory with move-to-end LRU semantics.
        if key in self._data:
            del self._data[key]
        self._data[key] = (expires_at, value)
        if len(self._data) > 500:
            self._data.popitem(last=False)
        return value

    async def aset(self, key: str, value: str, ttl: int | None = None) -> None:
        """Store *value* in memory and persist it to SQLite (best-effort)."""
        self.set(key, value, ttl)

        ttl = ttl or self._default_ttl
        now = time.time()
        expires_at = now + ttl

        try:
            from sqlalchemy import delete, func, select
            from sqlalchemy.dialects.sqlite import insert as sqlite_insert

            from app.database import CacheEntry, async_session_factory

            async with async_session_factory() as session:
                stmt = (
                    sqlite_insert(CacheEntry)
                    .values(key=key, value=value, expires_at=expires_at, created_at=now)
                    .on_conflict_do_update(
                        index_elements=[CacheEntry.key],
                        set_={'value': value, 'expires_at': expires_at},
                    )
                )
                await session.execute(stmt)

                # Prune expired rows, then keep the table bounded like memory.
                await session.execute(delete(CacheEntry).where(CacheEntry.expires_at <= now))
                total = await session.scalar(select(func.count()).select_from(CacheEntry))
                if total is not None and total > 500:
                    keep = (
                        select(CacheEntry.key)
                        .order_by(CacheEntry.expires_at.desc())
                        .limit(500)
                        .subquery()
                    )
                    await session.execute(
                        delete(CacheEntry).where(CacheEntry.key.notin_(select(keep.c.key)))
                    )
                await session.commit()
        except Exception:
            # DB unavailable — memory-only is still correct.
            return

    async def aget_cached(
        self,
        prompt: str,
        theme: str,
        style: str,
        model: str | None = None,
        plan: bool = False,
    ) -> str | None:
        """Async convenience: hash prompt+theme+style+model+plan and look up."""
        key = hash_prompt(prompt, theme, style, model or '', plan)
        return await self.aget(key)

    async def aset_cache(
        self,
        prompt: str,
        theme: str,
        style: str,
        html: str,
        model: str | None = None,
        plan: bool = False,
        ttl: int | None = None,
    ) -> None:
        """Async convenience: hash prompt+theme+style+model+plan and persist HTML."""
        key = hash_prompt(prompt, theme, style, model or '', plan)
        await self.aset(key, html, ttl)


# Module-level singleton
cache = TTLCache(default_ttl=settings.cache_ttl_seconds)
