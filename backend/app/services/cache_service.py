"""Simple in-memory cache with TTL for generated HTML designs."""

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


# Module-level singleton
cache = TTLCache(default_ttl=settings.cache_ttl_seconds)
