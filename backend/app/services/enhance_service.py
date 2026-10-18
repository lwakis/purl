"""Prompt enhancement: turn a short brief into a richer, concrete spec.

The enhanced prompt is shown to the user for review/edit before generation.
With a configured (ready) provider the rewrite is produced by the LLM using
``_stream_llm`` and its ``code`` text deltas. Without one — mock mode — an
equally useful, fully deterministic enhancement is built locally so tests and
offline demos behave predictably: the original brief is kept verbatim and
concrete guidance is appended in the prompt's own language.
"""

from __future__ import annotations

import json

from app.config import settings
from app.services.llm_service import (
    _stream_llm,
    _strip_code_fences,
    resolve_provider,
)
from app.services.mock_provider import detect_lang
from app.services.token_usage import UsageAccumulator, usage_store


class LLMProviderError(Exception):
    """Raised when the configured provider fails while enhancing a prompt."""


_SYSTEM_PROMPT = (
    'You improve short design briefs for a tool that generates a single, '
    "self-contained HTML page. Rewrite the user's brief into a fuller, more "
    'concrete specification: the page sections and their order, the layout, '
    'the specific content and copy to include, the visual style, and '
    'accessibility requirements. Preserve the original language and all of '
    "the user's original intent. Return ONLY the improved prompt — no "
    'explanations, no commentary, no markdown code fences. Keep it under 1500 '
    'characters.'
)

# Deterministic mock-mode guidance appended verbatim after the user's brief.
_MOCK_SUFFIX: dict[str, str] = {
    'en': (
        '\n\nBuild it as one self-contained HTML page. Include a header with '
        'navigation, a hero section stating the main value proposition, 3–6 '
        'content sections with concrete headings and sample copy, and a footer. '
        'Use a consistent color palette, a clear typographic scale and a '
        'spacing system, with a responsive layout that works from 320px '
        'upward. Add accessibility touches: semantic landmarks, descriptive '
        'alt text, visible focus states and prefers-reduced-motion support.'
    ),
    'ru': (
        '\n\nСобери это как одну самодостаточную HTML-страницу. Добавь шапку с '
        'навигацией, hero-секцию с главным предложением, 3–6 содержательных '
        'секций с конкретными заголовками и примерным текстом, а также подвал. '
        'Используй согласованную палитру цветов, понятную типографическую '
        'шкалу и систему отступов, сделай адаптивную вёрстку от 320px. Учти '
        'доступность: семантические ориентиры, описательный alt-текст, '
        'видимый фокус и поддержку prefers-reduced-motion.'
    ),
}


def _mock_enhance(prompt: str) -> str:
    """Deterministic enhancement: keep *prompt* verbatim, append guidance."""
    return prompt + _MOCK_SUFFIX[detect_lang(prompt)]


async def enhance_prompt(
    prompt: str,
    model: str | None = None,
    session_id: str | None = None,
) -> str:
    """Return a richer, concrete version of *prompt*.

    Uses the configured LLM provider when ready; otherwise a deterministic
    mock enhancement in the prompt's language. Provider failures raise
    ``LLMProviderError`` for the router to map to HTTP 502. The result is
    truncated to ``settings.max_prompt_length`` characters.
    """
    provider = resolve_provider(model)

    if not provider.ready:
        return _mock_enhance(prompt)[: settings.max_prompt_length]

    usage = UsageAccumulator()
    chunks: list[str] = []

    async for sse in _stream_llm(provider, _SYSTEM_PROMPT, prompt, usage=usage):
        if not sse.startswith('data: '):
            continue
        try:
            payload = json.loads(sse[6:])
        except (json.JSONDecodeError, IndexError):
            continue
        event_type = payload.get('type')
        if event_type == 'code':
            chunks.append(payload.get('content', ''))
        elif event_type == 'error':
            raise LLMProviderError(payload.get('content', 'llm_provider_error'))

    usage_store.add(session_id, usage.snapshot())

    enhanced = _strip_code_fences(''.join(chunks))
    if not enhanced:
        enhanced = prompt
    return enhanced[: settings.max_prompt_length]
