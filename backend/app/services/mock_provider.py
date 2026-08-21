"""Mock-mode HTML generation used when no LLM provider is configured.

Keeps the hardcoded landing-page template and its chunked streaming
generator out of the orchestration layer (``llm_service``).

The template speaks the prompt's language: Cyrillic prompts get the
Russian copy, everything else falls back to English — so mock mode
looks right in demos and screenshots for any audience.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

from app.services.llm_service import _sse_event


def detect_lang(prompt: str) -> str:
    """Return ``'ru'`` when the prompt is mostly Cyrillic, else ``'en'``."""
    cyr = sum(1 for ch in prompt if '\u0400' <= ch <= '\u04ff')
    lat = sum(1 for ch in prompt if ch.isascii() and ch.isalpha())
    return 'ru' if cyr > lat else 'en'


# ── Copy packs ───────────────────────────────────────────────────────────────

_MOCK_TEXTS: dict[str, dict] = {
    'en': {
        'lang': 'en',
        'title': 'Purl AI — Your design',
        'default_headline': 'Your design is ready',
        'default_sub': 'A professional design mockup based on your description.',
        'nav': ('Home', 'Features', 'Pricing', 'Contact'),
        'cta_primary': 'Start free →',
        'cta_secondary': 'Learn more',
        'intro': 'Generating mockup...\n',
        'plan': (
            'Analyze requirements and page structure',
            'Build the token system and layout',
            'Markup, styling and responsiveness',
        ),
        'branches': {
            'landing': (
                'Launch your product',
                'A modern landing page for your SaaS product with a conversion-focused design.',
            ),
            'dashboard': (
                'Real-time analytics',
                'Track key metrics and make data-driven decisions.',
            ),
            'signup': ('Create your account', 'Sign up and get started in minutes.'),
            'portfolio': ('My work', 'A portfolio with project filtering by category.'),
            'blog': ('Latest articles', 'A blog with useful articles and insights.'),
            'contact': ('Get in touch', 'Leave a request and we will get back to you shortly.'),
            'pricing': ('Choose your plan', 'A fitting plan for any scale.'),
        },
        'features': (
            ('🚀', 'Rapid development', 'Generate a mockup in seconds from your description.'),
            ('🎨', 'Unique design', 'Every mockup is built from scratch for your task and style.'),
            ('📱', 'Responsive layout', 'Looks right on every device from 320px to 1440px.'),
            (
                '⚡',
                'Micro-interactions',
                'Smooth animations and interactive elements for better UX.',
            ),
            ('♿', 'Accessibility', 'ARIA labels, keyboard support and prefers-reduced-motion.'),
            ('🔧', 'Production-ready code', 'Clean HTML/CSS/JS you can drop into your project.'),
        ),
    },
    'ru': {
        'lang': 'ru',
        'title': 'Purl AI — Ваш дизайн',
        'default_headline': 'Ваш дизайн — уже готов',
        'default_sub': 'Профессиональный дизайн-макет на основе вашего описания.',
        'nav': ('Главная', 'Возможности', 'Тарифы', 'Контакты'),
        'cta_primary': 'Начать бесплатно →',
        'cta_secondary': 'Узнать больше',
        'intro': 'Генерирую макет...\n',
        'plan': (
            'Анализ требований и структуры страницы',
            'Создание токен-системы и макета',
            'Вёрстка, стилизация и адаптивность',
        ),
        'branches': {
            'landing': (
                'Запустите ваш продукт',
                'Современный лендинг для вашего SaaS-продукта с конверсионным дизайном.',
            ),
            'dashboard': (
                'Аналитика в реальном времени',
                'Отслеживайте ключевые метрики и принимайте решения на основе данных.',
            ),
            'signup': ('Создайте аккаунт', 'Зарегистрируйтесь и начните работать за пару минут.'),
            'portfolio': ('Мои работы', 'Портфолио с фильтрацией проектов по категориям.'),
            'blog': ('Последние статьи', 'Блог с полезными материалами и аналитикой.'),
            'contact': ('Свяжитесь с нами', 'Оставьте заявку и мы ответим в ближайшее время.'),
            'pricing': ('Выберите ваш тариф', 'Подходящий план для любого масштаба.'),
        },
        'features': (
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
            (
                '⚡',
                'Micro-interactions',
                'Плавные анимации и интерактивные элементы для лучшего UX.',
            ),
            ('♿', 'Доступность', 'ARIA-метки, поддержка клавиатуры и prefers-reduced-motion.'),
            (
                '🔧',
                'Готовый код',
                'Чистый HTML/CSS/JS код, готовый к использованию в вашем проекте.',
            ),
        ),
    },
}

# Shared keyword matchers: branch key -> keywords (RU and EN mixed).
_BRANCH_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ('landing', ('лендинг', 'landing', 'продукт', 'saas', 'startup')),
    ('dashboard', ('дашборд', 'dashboard', 'аналитик', 'метрик')),
    ('signup', ('регистраци', 'signup', 'форма')),
    ('portfolio', ('портфолио', 'portfolio')),
    ('blog', ('блог', 'blog', 'статья', 'article')),
    ('contact', ('контакт', 'contact', 'обратная связь')),
    ('pricing', ('тариф', 'pricing', 'price', 'подписк')),
)

# Progress messages shown by the frontend while the mock stream runs.
_STATUS: dict[str, dict[str, str]] = {
    'en': {
        'analysis': 'Analyzing your request...',
        'design': 'Designing the layout and token system...',
        'intro': 'Generating mockup...\n',
        'iter_analysis': 'Analyzing your change request...',
        'iter_design': 'Applying design changes...',
        'iter_intro': 'Updating mockup...\n',
    },
    'ru': {
        'analysis': 'Анализирую ваш запрос...',
        'design': 'Создаю дизайн и токен-систему...',
        'intro': 'Генерирую макет...\n',
        'iter_analysis': 'Анализирую запрос на доработку...',
        'iter_design': 'Вношу изменения в дизайн...',
        'iter_intro': 'Обновляю макет...\n',
    },
}


def status_texts(lang: str) -> dict[str, str]:
    """Progress messages for the mock stream in the given language."""
    return _STATUS.get(lang, _STATUS['en'])


def plan_comment(lang: str) -> str:
    """HTML comment listing the planned steps, in the given language."""
    lines = _MOCK_TEXTS.get(lang, _MOCK_TEXTS['en'])['plan']
    return '<!-- PLAN:\n' + '\n'.join(f'- {line}' for line in lines) + '\n-->'


# ── Template ─────────────────────────────────────────────────────────────────

_MOCK_TEMPLATE = """<!DOCTYPE html>
<html lang="{lang}" data-theme="{theme}">
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
      <nav>{nav_html}</nav>
    </header>
    <section class="hero">
      <h1>{headline}</h1>
      <p>{subheadline}</p>
      <div class="cta-group">
        <a href="#" class="btn btn-primary">{cta_primary}</a>
        <a href="#" class="btn btn-secondary">{cta_secondary}</a>
      </div>
    </section>
    <section class="features">
      {features_html}
    </section>
    <footer class="footer">
      <p>© 2026 Purl.</p>
    </footer>
  </div>
</body>
</html>"""


def _mock_generate_html(prompt: str, theme: str, style: str, plan: bool = False) -> str:
    """Return a hardcoded, beautiful HTML page based on prompt keywords."""
    t = _MOCK_TEXTS[detect_lang(prompt)]
    title = t['title']
    headline = t['default_headline']
    subheadline = t['default_sub']

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
    for key, keywords in _BRANCH_KEYWORDS:
        if any(w in lower for w in keywords):
            headline, subheadline = t['branches'][key]
            break

    features_html = ''
    for icon, feat_title, desc in t['features']:
        features_html += f"""
      <div class="feature-card" tabindex="0" role="article" aria-label="{feat_title}">
        <div class="feature-icon" aria-hidden="true">{icon}</div>
        <h3>{feat_title}</h3>
        <p>{desc}</p>
      </div>"""

    nav_html = ''.join(f'<a href="#">{label}</a>' for label in t['nav'])

    html = _MOCK_TEMPLATE.format(
        lang=t['lang'],
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
        cta_primary=t['cta_primary'],
        cta_secondary=t['cta_secondary'],
        nav_html=nav_html,
        features_html=features_html,
    )
    if plan:
        html = plan_comment(t['lang']) + '\n' + html
    return html


async def _stream_mock(full_html: str, intro: str | None = None) -> AsyncGenerator[str]:
    """Yield an existing HTML string in small chunks for a realistic stream."""
    yield _sse_event('code', intro if intro is not None else 'Generating mockup...\n')
    await asyncio.sleep(0.2)
    chunk_size = 50
    for i in range(0, len(full_html), chunk_size):
        yield _sse_event('code', full_html[i : i + chunk_size])
        await asyncio.sleep(0.01)
