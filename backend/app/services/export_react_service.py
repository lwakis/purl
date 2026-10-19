"""React export: convert a single-file HTML page into one React component.

The conversion is shown to the user as copyable ``.jsx`` source. With a
configured (ready) provider the component is produced by the LLM using
``_stream_llm`` and its ``code`` text deltas. Without one — mock mode — a fully
deterministic, always-valid component is built locally so tests and offline
demos behave predictably: the raw HTML is embedded verbatim via
``dangerouslySetInnerHTML`` behind an empty CSS constant.
"""

from __future__ import annotations

import json

from app.services.llm_service import (
    _stream_llm,
    _strip_code_fences,
    resolve_provider,
)
from app.services.token_usage import UsageAccumulator, usage_store


class LLMProviderError(Exception):
    """Raised when the configured provider fails while exporting to React."""


_SYSTEM_PROMPT = (
    'You convert a single self-contained HTML page into ONE React functional '
    'component. Return ONLY the component code — no markdown code fences, no '
    'explanations, no import statements. Export a single default component '
    'named `App`. Use JSX conventions: `className` instead of `class`, '
    '`htmlFor` instead of `for`, and self-closed void elements. Keep the '
    'structure, text content and visual design identical to the source. Move '
    'all CSS from `<style>` tags into one template-literal constant named `css` '
    'and render it once via `<style>{css}</style>` inside the component. Convert '
    'any `<script>` logic into `useEffect` hooks or event handlers where '
    'reasonable. Do not use external libraries; inline SVG is fine. The result '
    'must compile as-is in a Vite or CRA project.'
)


def _mock_react(code: str) -> str:
    """Deterministic, always-valid component that embeds the HTML verbatim."""
    return (
        '// Mock React export: connect a provider for a real conversion.\n'
        '\n'
        'const css = ``;\n'
        '\n'
        f'const html = {json.dumps(code)};\n'
        '\n'
        'export default function App() {\n'
        '  return (\n'
        '    <div>\n'
        '      <style>{css}</style>\n'
        '      <div dangerouslySetInnerHTML={{ __html: html }} />\n'
        '    </div>\n'
        '  );\n'
        '}\n'
    )


async def convert_to_react(code: str, model: str | None = None) -> str:
    """Return *code* (a single HTML page) as one React functional component.

    Uses the configured LLM provider when ready; otherwise a deterministic
    mock component. Provider failures raise ``LLMProviderError`` for the router
    to map to HTTP 502.
    """
    provider = resolve_provider(model)

    if not provider.ready:
        return _mock_react(code)

    user_message = f'Convert this HTML page:\n\n```html\n{code}\n```'

    usage = UsageAccumulator()
    chunks: list[str] = []

    async for sse in _stream_llm(provider, _SYSTEM_PROMPT, user_message, usage=usage):
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

    usage_store.add(None, usage.snapshot())

    converted = _strip_code_fences(''.join(chunks))
    if not converted:
        converted = _mock_react(code)
    return converted
