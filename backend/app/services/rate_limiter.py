"""Simple in-memory rate limiter with periodic cleanup."""

from __future__ import annotations

import time
from collections import defaultdict
from typing import NamedTuple


class RateLimitResult(NamedTuple):
    allowed: bool
    remaining: int
    reset_time: float  # Unix timestamp when the bucket resets


class InMemoryRateLimiter:
    """Sliding-window rate limiter keyed by session ID."""

    def __init__(self) -> None:
        self._buckets: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup: float = time.monotonic()

    def _cleanup(self, window: float = 3600.0) -> None:
        """Remove timestamps outside the current window."""
        now = time.monotonic()
        if now - self._last_cleanup < 60:  # clean at most once per minute
            return
        self._last_cleanup = now
        cutoff = now - window
        for key in list(self._buckets):
            self._buckets[key] = [t for t in self._buckets[key] if t > cutoff]
            if not self._buckets[key]:
                del self._buckets[key]

    def check(self, key: str, limit_per_hour: int) -> RateLimitResult:
        """Check whether *key* is allowed to make a request.

        Returns a ``RateLimitResult`` with ``allowed``, ``remaining`` count,
        and the Unix timestamp when the oldest entry expires.
        """
        self._cleanup()
        now = time.monotonic()
        window = 3600.0
        cutoff = now - window

        entries = self._buckets.get(key, [])
        # Remove expired entries
        entries = [t for t in entries if t > cutoff]
        self._buckets[key] = entries

        remaining = max(0, limit_per_hour - len(entries))
        reset_time = entries[0] + window if entries else now + window

        if len(entries) >= limit_per_hour:
            return RateLimitResult(False, 0, reset_time)

        entries.append(now)
        return RateLimitResult(True, remaining, reset_time)


# Module-level singleton
rate_limiter = InMemoryRateLimiter()
