"""Async multi-provider LLM orchestration with SSE streaming and a mock fallback.

Orchestration only: resolves the provider, dispatches to the wire-protocol
streamers (``app.services.providers``) or the mock-mode generator
(``app.services.mock_provider``), and formats SSE events. Owns the single
shared ``httpx.AsyncClient`` reused across all streaming requests.
"""

from __future__ import annotations

import asyncio
import dataclasses
import json
import re
from collections.abc import AsyncGenerator

import httpx

from app.config import LLM_PRESETS, settings


@dataclasses.dataclass(frozen=True)
class ProviderConfig:
    """Resolved LLM endpoint ready for streaming."""

    name: str
    base_url: str
    model: str
    api: str
    api_key: str
    ready: bool


def resolve_provider() -> ProviderConfig:
    """Resolve settings into a concrete provider endpoint.

    ``custom`` uses LLM_BASE_URL/LLM_MODEL verbatim (any OpenAI-compatible
    endpoint). ``ollama`` needs no API key; every other preset does. An unknown
    provider name or a missing required endpoint yields ``ready=False``.
    """
    name = settings.llm_provider.lower()

    if name == 'custom':
        if not settings.llm_base_url:
            return ProviderConfig('custom', '', '', 'openai', '', False)
        endpoint: tuple[str, str, str] = (
            settings.llm_base_url,
            settings.llm_model or 'gpt-4o',
            'openai',
        )
    elif name in LLM_PRESETS:
        endpoint = LLM_PRESETS[name]
    else:
        return ProviderConfig(name, '', '', 'openai', '', False)

    base_url, model, api = endpoint
    api_key = settings.llm_api_key
    ready = name == 'ollama' or bool(api_key)
    return ProviderConfig(name, base_url, model, api, api_key, ready)


def _sse_event(event_type: str, content: str) -> str:
    """Format a Server-Sent Event data frame."""
    payload = json.dumps({'type': event_type, 'content': content}, ensure_ascii=False)
    return f'data: {payload}\n\n'


def _strip_code_fences(html: str) -> str:
    """Remove markdown code-fence markers from a finished HTML document."""
    html = re.sub(r'^```[a-zA-Z0-9_-]*\s*\n?', '', html)
    html = re.sub(r'\n```\s*$', '', html)
    html = re.sub(r'\n```[a-zA-Z0-9_-]*\s*\n', '\n', html)
    return html.strip()


class FenceStripper:
    """Strip markdown code fences from a stream of code chunks.

    LLMs commonly wrap their HTML output in ```html ... ``` fences. The
    ``complete`` event cleans them up via ``_strip_code_fences``, but the
    intermediate ``code`` chunks are streamed raw — so the opening fence
    (````` ```html ````) and the closing one (````` ``` ````) flash in the live
    preview during generation. This stripper removes fence markers on the fly,
    tolerating fences split across chunk boundaries.
    """

    def __init__(self) -> None:
        self._buffer = ''
        self._seen_code = False

    def feed(self, chunk: str) -> str:
        """Return *chunk* with fence markers removed, preserving newlines.

        Incomplete trailing lines are buffered until the rest of the line
        arrives, so a fence split across two chunks is still recognised.
        """
        self._buffer += chunk
        out: list[str] = []
        while '\n' in self._buffer:
            line, sep, self._buffer = self._buffer.partition('\n')
            cleaned = self._clean_line(line)
            if cleaned is not None:
                out.append(cleaned + sep)
        return ''.join(out)

    def flush(self) -> str:
        """Emit any buffered tail, dropping a trailing fence marker."""
        if not self._buffer:
            return ''
        tail, self._buffer = self._buffer, ''
        cleaned = self._clean_line(tail)
        return cleaned if cleaned is not None else ''

    def _clean_line(self, line: str) -> str | None:
        """Return the line with fence markers removed, or None to drop it."""
        stripped = line.rstrip('\r\n')
        if not self._seen_code and self._is_opening_fence(stripped):
            self._seen_code = True
            return None
        if self._seen_code and self._is_closing_fence(stripped):
            self._seen_code = False
            return None
        if self._seen_code and self._is_opening_fence(stripped):
            return None
        return line

    @staticmethod
    def _is_opening_fence(line: str) -> bool:
        return re.fullmatch(r'```(?:[a-zA-Z0-9_-]+)?', line) is not None

    @staticmethod
    def _is_closing_fence(line: str) -> bool:
        return line == '```'


async def _stream_cleaned_code(
    events: AsyncGenerator[str],
) -> AsyncGenerator[tuple[str, str]]:
    """Yield ``(sse, cleaned)`` pairs for an SSE event stream.

    ``code`` events have markdown fences removed from their content; every
    other event type passes through untouched (``cleaned`` is ``''``). The
    final buffered tail is flushed as one last ``code`` event so no content is
    lost at the end of the stream.
    """
    stripper = FenceStripper()
    async for sse in events:
        if sse.startswith('data: '):
            try:
                payload = json.loads(sse[6:])
            except (json.JSONDecodeError, IndexError):
                pass
            else:
                if payload.get('type') == 'code':
                    cleaned = stripper.feed(payload.get('content', ''))
                    yield _sse_event('code', cleaned), cleaned
                    continue
        yield sse, ''

    tail = stripper.flush()
    if tail:
        yield _sse_event('code', tail), tail


# ── Shared HTTP client ────────────────────────────────────────────────────────
# One client for the whole process: httpx.AsyncClient pools connections and
# supports concurrent streams, so per-request clients are unnecessary.

_client: httpx.AsyncClient | None = None


async def _get_client() -> httpx.AsyncClient:
    """Return the shared streaming client, creating it lazily on first use."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=120.0)
    return _client


async def close_llm_client() -> None:
    """Close the shared streaming client; called on application shutdown."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


# ── Streaming dispatch ────────────────────────────────────────────────────────


async def _stream_llm(
    provider: ProviderConfig,
    system_prompt: str,
    user_message: str,
) -> AsyncGenerator[str]:
    """Dispatch to the provider's wire protocol, translating failures to SSE error events."""
    from app.services.providers import _stream_anthropic, _stream_provider

    try:
        if provider.api == 'anthropic':
            async for sse in _stream_anthropic(provider, system_prompt, user_message):
                yield sse
        else:
            async for sse in _stream_provider(provider, system_prompt, user_message):
                yield sse
    except httpx.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else ''
        yield _sse_event('error', f'Ошибка LLM-провайдера ({status}). Проверьте ключ и настройки.')


# ── Public API ───────────────────────────────────────────────────────────────


async def generate(
    prompt: str,
    theme: str = 'auto',
    style: str = 'minimal',
) -> AsyncGenerator[str]:
    """Generate a design as an SSE event stream.

    Yields event strings in the format ``data: {"type": "...", "content": "..."}\n\n``.

    Event types:
    - ``analysis`` – analysing the prompt
    - ``design`` – designing the layout
    - ``code`` – streaming HTML tokens
    - ``complete`` – final event with the full HTML code
    - ``error`` – an error occurred
    """
    from app.services.mock_provider import _mock_generate_html, _stream_mock
    from app.services.prompt_service import build_generate_prompt, build_system_prompt

    system = build_system_prompt(theme, style)
    user_msg = build_generate_prompt(prompt)

    yield _sse_event('analysis', 'Анализирую ваш запрос...')
    await asyncio.sleep(0.3)

    yield _sse_event('design', 'Создаю дизайн и токен-систему...')
    await asyncio.sleep(0.3)

    provider = resolve_provider()

    full_html = ''

    if not provider.ready:
        full_html = _mock_generate_html(prompt, theme, style)
        async for sse in _stream_mock(full_html):
            yield sse
    else:
        async for sse, cleaned in _stream_cleaned_code(
            _stream_llm(provider, system, user_msg)
        ):
            full_html += cleaned
            yield sse

    yield _sse_event('complete', _strip_code_fences(full_html))


async def iterate_stream(
    system_prompt: str,
    history: list[dict[str, str]],
    current_code: str,
    user_message: str,
) -> AsyncGenerator[str]:
    """Iterate on existing design, yielding SSE events.

    *system_prompt* – the full system prompt including theme/style instructions.
    *history* – list of ``{"role": "user"|"assistant", "content": "..."}`` messages.
    *current_code* – the current HTML code.
    *user_message* – the user's iteration request.
    """
    from app.services.mock_provider import _stream_mock
    from app.services.prompt_service import build_iterate_prompt

    iterate_msg = build_iterate_prompt(history, current_code, user_message)

    yield _sse_event('analysis', 'Анализирую запрос на доработку...')
    await asyncio.sleep(0.3)

    yield _sse_event('design', 'Вношу изменения в дизайн...')
    await asyncio.sleep(0.3)

    provider = resolve_provider()

    full_html = ''

    if not provider.ready:
        full_html = current_code
        if '<!-- Iteration' not in full_html:
            full_html = current_code.replace(
                '</body>',
                f'  <!-- Iteration: {user_message} -->\n</body>',
            )
            if full_html == current_code:
                full_html += f'\n<!-- Iteration: {user_message} -->\n'
        async for sse in _stream_mock(full_html, intro='Обновляю макет...\n'):
            yield sse
    else:
        async for sse, cleaned in _stream_cleaned_code(
            _stream_llm(provider, system_prompt, iterate_msg)
        ):
            full_html += cleaned
            yield sse

    yield _sse_event('complete', _strip_code_fences(full_html))
