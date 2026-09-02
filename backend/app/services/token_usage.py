"""Per-session LLM token usage tracking.

Purely informational: self-hosted users pay for their own LLM API and may
want to see how many tokens a session has burned through. Counts are kept
in memory keyed by the browser's ``session_id`` and reported through
``GET /api/usage``. Nothing here is persisted — matching the cache, a
restart resets the counts.
"""

from __future__ import annotations

import dataclasses


@dataclasses.dataclass(frozen=True)
class TokenUsage:
    """A single token count snapshot (input and output tokens)."""

    prompt_tokens: int = 0
    completion_tokens: int = 0

    @property
    def total(self) -> int:
        return self.prompt_tokens + self.completion_tokens


class UsageAccumulator:
    """Mutable running counter that provider streamers write into.

    ``_stream_provider`` / ``_stream_anthropic`` parse usage frames and add to
    this object in place, so the substantially-unchanged ``AsyncGenerator[str]``
    signatures (which yield SSE strings) can still surface usage to the caller.
    """

    def __init__(self) -> None:
        self.prompt_tokens = 0
        self.completion_tokens = 0

    def add_prompt(self, tokens: int) -> None:
        self.prompt_tokens += tokens

    def add_completion(self, tokens: int) -> None:
        self.completion_tokens += tokens

    def snapshot(self) -> TokenUsage:
        return TokenUsage(self.prompt_tokens, self.completion_tokens)


class InMemoryTokenUsageStore:
    """Cumulative token usage keyed by ``session_id``."""

    def __init__(self) -> None:
        self._by_session: dict[str, TokenUsage] = {}

    def add(self, session_id: str | None, usage: TokenUsage) -> None:
        """Accumulate *usage* into the bucket for *session_id*.

        A missing ``session_id`` (e.g. anonymous requests) is skipped: token
        usage only makes sense attributed to a session that can be queried.
        """
        if not session_id:
            return
        prev = self._by_session.get(session_id, TokenUsage())
        self._by_session[session_id] = TokenUsage(
            prev.prompt_tokens + usage.prompt_tokens,
            prev.completion_tokens + usage.completion_tokens,
        )

    def get(self, session_id: str | None) -> TokenUsage | None:
        """Return cumulative usage for *session_id*, or ``None`` if unknown."""
        if not session_id:
            return None
        return self._by_session.get(session_id)


# Module-level singleton, reset between tests like the cache and rate limiter.
usage_store = InMemoryTokenUsageStore()
