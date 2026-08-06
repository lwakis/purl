"""Async multi-provider LLM client with SSE streaming and a mock fallback.

Supports any OpenAI-compatible /chat/completions endpoint plus the Anthropic
Messages API. When no API key is configured (or the provider is unreachable)
generation falls back to a local mock template.
"""

from __future__ import annotations

import asyncio
import dataclasses
import json
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
    import re

    html = re.sub(r'^```(?:html)?\s*\n?', '', html)
    html = re.sub(r'\n```\s*$', '', html)
    html = re.sub(r'\n```\n', '\n', html)
    return html.strip()


# ── HTML templates for mock mode ────────────────────────────────────────────

_MOCK_TEMPLATE = """<!DOCTYPE html>
<html lang="ru" data-theme="{theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  :root {{
    --color-bg: {bg};
    --color-surface: {surface};
    --color-text: {text};
    --color-text-secondary: {text_sec};
    --color-primary: {primary};
    --color-primary-hover: {primary_hover};
    --color-accent: {accent};
    --radius: 12px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 48px;
    --font-family: 'Inter', system-ui, -apple-system, sans-serif;
    --transition: 200ms ease;
  }}
  body {{
    font-family: var(--font-family);
    background: var(--color-bg);
    color: var(--color-text);
    line-height: 1.6;
    min-height: 100vh;
  }}
  .container {{ max-width: 1200px; margin: 0 auto; padding: var(--space-lg); }}
  header {{
    display: flex; justify-content: space-between; align-items: center;
    padding: var(--space-md) var(--space-lg);
    background: var(--color-surface);
    border-radius: var(--radius);
    margin-bottom: var(--space-xl);
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }}
  .logo {{ font-weight: 800; font-size: 1.5rem; color: var(--color-primary); }}
  nav a {{
    color: var(--color-text-secondary); text-decoration: none; margin-left: var(--space-lg);
    transition: color var(--transition);
  }}
  nav a:hover {{ color: var(--color-primary); }}
  .hero {{
    text-align: center; padding: var(--space-xl) 0;
  }}
  .hero h1 {{
    font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800;
    background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; margin-bottom: var(--space-md);
  }}
  .hero p {{
    font-size: 1.125rem; color: var(--color-text-secondary);
    max-width: 600px; margin: 0 auto var(--space-lg);
  }}
  .cta-group {{ display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap; }}
  .btn {{
    display: inline-flex; align-items: center; gap: var(--space-sm);
    padding: 12px 28px; border-radius: 999px; font-weight: 600;
    font-size: 1rem; border: none; cursor: pointer;
    transition: all var(--transition); text-decoration: none;
  }}
  .btn-primary {{ background: var(--color-primary); color: #fff; }}
  .btn-primary:hover {{ background: var(--color-primary-hover); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.35); }}
  .btn-secondary {{ background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-text-secondary); }}
  .btn-secondary:hover {{ border-color: var(--color-primary); color: var(--color-primary); }}
  .features {{
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-lg); margin-top: var(--space-xl);
  }}
  .feature-card {{
    background: var(--color-surface); border-radius: var(--radius);
    padding: var(--space-lg); transition: all var(--transition);
    border: 1px solid transparent;
  }}
  .feature-card:hover {{ border-color: var(--color-primary); transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.08); }}
  .feature-icon {{ font-size: 2rem; margin-bottom: var(--space-sm); }}
  .feature-card h3 {{ margin-bottom: var(--space-sm); }}
  .feature-card p {{ color: var(--color-text-secondary); font-size: 0.9375rem; }}
  .footer {{
    text-align: center; padding: var(--space-xl) 0;
    color: var(--color-text-secondary); font-size: 0.875rem;
    margin-top: var(--space-xl);
  }}
  @media (prefers-reduced-motion: reduce) {{ *, *::before, *::after {{ transition-duration: 0s !important; }} }}
  @media (prefers-color-scheme: dark) {{
    :root[data-theme="auto"] {{
      --color-bg: #0f0f13; --color-surface: #1a1a23;
      --color-text: #e4e4ec; --color-text-secondary: #8b8b9e;
      --color-primary: #6366f1; --color-primary-hover: #818cf8; --color-accent: #a78bfa;
    }}
  }}
</style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">Purl</div>
      <nav><a href="#">Главная</a><a href="#">Возможности</a><a href="#">Тарифы</a><a href="#">Контакты</a></nav>
    </header>
    <section class="hero">
      <h1>{headline}</h1>
      <p>{subheadline}</p>
      <div class="cta-group">
        <a href="#" class="btn btn-primary">Начать бесплатно →</a>
        <a href="#" class="btn btn-secondary">Узнать больше</a>
      </div>
    </section>
    <section class="features">
      {features_html}
    </section>
    <footer class="footer">
      <p>© 2025 Purl. Создано с помощью AI.</p>
    </footer>
  </div>
</body>
</html>"""


def _mock_generate_html(prompt: str, theme: str, style: str) -> str:
    """Return a hardcoded, beautiful HTML page based on prompt keywords."""
    title = 'Purl AI — Ваш дизайн'
    headline = 'Создано с помощью ИИ'
    subheadline = 'Профессиональный дизайн-макет на основе вашего описания.'

    # Theme colours
    if theme == 'dark':
        bg, surface = '#0f0f13', '#1a1a23'
        text, text_sec = '#e4e4ec', '#8b8b9e'
    else:
        bg, surface = '#f8f9fc', '#ffffff'
        text, text_sec = '#1a1a2e', '#6b6b80'

    if style == 'corporate':
        primary, primary_hover, accent = '#2563eb', '#3b82f6', '#60a5fa'
    elif style == 'playful':
        primary, primary_hover, accent = '#ec4899', '#f472b6', '#fbbf24'
    elif style == 'techno':
        primary, primary_hover, accent = '#06b6d4', '#22d3ee', '#8b5cf6'
    else:  # minimal
        primary, primary_hover, accent = '#6366f1', '#818cf8', '#a78bfa'

    # Extract keywords from prompt
    lower = prompt.lower()
    if any(w in lower for w in ('лендинг', 'landing', 'продукт', 'saas', 'startup')):
        headline = 'Запустите ваш продукт'
        subheadline = 'Современный лендинг для вашего SaaS-продукта с конверсионным дизайном.'
    elif any(w in lower for w in ('дашборд', 'dashboard', 'аналитик', 'метрик')):
        headline = 'Аналитика в реальном времени'
        subheadline = 'Отслеживайте ключевые метрики и принимайте решения на основе данных.'
    elif any(w in lower for w in ('регистраци', 'signup', 'регистрация', 'форма')):
        headline = 'Создайте аккаунт'
        subheadline = 'Зарегистрируйтесь и начните работать за пару минут.'
    elif any(w in lower for w in ('портфолио', 'portfolio', 'портфолио')):
        headline = 'Мои работы'
        subheadline = 'Портфолио с фильтрацией проектов по категориям.'
    elif any(w in lower for w in ('блог', 'blog', 'статья', 'article')):
        headline = 'Последние статьи'
        subheadline = 'Блог с полезными материалами и аналитикой.'
    elif any(w in lower for w in ('контакт', 'contact', 'обратная связь')):
        headline = 'Свяжитесь с нами'
        subheadline = 'Оставьте заявку и мы ответим в ближайшее время.'
    elif any(w in lower for w in ('тариф', 'pricing', 'price', 'подписк')):
        headline = 'Выберите ваш тариф'
        subheadline = 'Подходящий план для любого масштаба.'

    features_html = ''
    feature_data = [
        (
            '🚀',
            'Быстрая разработка',
            'Создание макета за считанные секунды на основе вашего описания.',
        ),
        ('🎨', 'Уникальный дизайн', 'Каждый макет создаётся с нуля под вашу задачу и стиль.'),
        (
            '📱',
            'Адаптивная верстка',
            'Корректное отображение на всех устройствах от 320px до 1440px.',
        ),
        ('⚡', 'Micro-interactions', 'Плавные анимации и интерактивные элементы для лучшего UX.'),
        ('♿', 'Доступность', 'ARIA-метки, поддержка клавиатуры и prefers-reduced-motion.'),
        ('🔧', 'Готовый код', 'Чистый HTML/CSS/JS код, готовый к использованию в вашем проекте.'),
    ]
    for icon, feat_title, desc in feature_data:
        features_html += f"""
      <div class="feature-card" tabindex="0" role="article" aria-label="{feat_title}">
        <div class="feature-icon" aria-hidden="true">{icon}</div>
        <h3>{feat_title}</h3>
        <p>{desc}</p>
      </div>"""

    return _MOCK_TEMPLATE.format(
        theme=theme,
        title=title,
        bg=bg,
        surface=surface,
        text=text,
        text_sec=text_sec,
        primary=primary,
        primary_hover=primary_hover,
        accent=accent,
        headline=headline,
        subheadline=subheadline,
        features_html=features_html,
    )


# ── Streaming generators ─────────────────────────────────────────────────────


async def _stream_provider(
    provider: ProviderConfig,
    system_prompt: str,
    user_message: str,
) -> AsyncGenerator[str]:
    """Stream HTML tokens from the resolved provider, yielding SSE strings.

    ``provider.api`` selects the wire protocol: ``openai`` (OpenAI-compatible
    /chat/completions) or ``anthropic`` (Messages API). Individual non-fatally
    malformed frames are skipped.
    """
    endpoint = f'{provider.base_url.rstrip("/")}/chat/completions'

    headers = {
        'content-type': 'application/json',
    }
    if provider.api_key:
        headers['authorization'] = f'Bearer {provider.api_key}'

    body = {
        'model': provider.model,
        'max_tokens': settings.llm_max_tokens,
        'temperature': settings.llm_temperature,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_message},
        ],
        'stream': True,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream('POST', endpoint, headers=headers, json=body) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith('data: '):
                    continue
                payload = line[6:].strip()
                if payload == '[DONE]':
                    break
                try:
                    event = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                choices = event.get('choices', [])
                if not choices:
                    continue
                text = choices[0].get('delta', {}).get('content')
                if text:
                    yield _sse_event('code', text)


async def _stream_anthropic(
    provider: ProviderConfig,
    system_prompt: str,
    user_message: str,
) -> AsyncGenerator[str]:
    """Stream HTML text from the Anthropic Messages API, yielding SSE."""
    endpoint = f'{provider.base_url.rstrip("/")}/messages'
    body = {
        'model': provider.model,
        'max_tokens': settings.llm_max_tokens,
        'temperature': settings.llm_temperature,
        'system': system_prompt,
        'messages': [{'role': 'user', 'content': user_message}],
        'stream': True,
    }
    headers = {
        'content-type': 'application/json',
        'x-api-key': provider.api_key,
        'anthropic-version': '2023-06-01',
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream('POST', endpoint, headers=headers, json=body) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith('data: '):
                    continue
                payload = line[6:].strip()
                if payload in ('[DONE]', 'event: message_stop'):
                    break
                try:
                    event = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                if event.get('type') != 'content_block_delta':
                    continue
                delta = event.get('delta') or {}
                text = delta.get('text') if delta.get('type') == 'text_delta' else ''
                if text:
                    yield _sse_event('code', text)


async def _stream_llm(
    provider: ProviderConfig,
    system_prompt: str,
    user_message: str,
) -> AsyncGenerator[str]:
    """Dispatch to the provider's wire protocol, translating failures to SSE error events."""
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


async def _stream_mock(full_html: str, intro: str = 'Генерирую макет...\n') -> AsyncGenerator[str]:
    """Yield an existing HTML string in small chunks for a realistic stream."""
    yield _sse_event('code', intro)
    await asyncio.sleep(0.2)
    chunk_size = 50
    for i in range(0, len(full_html), chunk_size):
        yield _sse_event('code', full_html[i : i + chunk_size])
        await asyncio.sleep(0.01)


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
        async for sse in _stream_llm(provider, system, user_msg):
            if sse.startswith('data: '):
                try:
                    payload = json.loads(sse[6:])
                    if payload.get('type') == 'code':
                        full_html += payload.get('content', '')
                except (json.JSONDecodeError, IndexError):
                    pass
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
        async for sse in _stream_llm(provider, system_prompt, iterate_msg):
            if sse.startswith('data: '):
                try:
                    payload = json.loads(sse[6:])
                    if payload.get('type') == 'code':
                        full_html += payload.get('content', '')
                except (json.JSONDecodeError, IndexError):
                    pass
            yield sse

    yield _sse_event('complete', _strip_code_fences(full_html))
