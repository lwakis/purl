"""Mock-mode HTML generation used when no LLM provider is configured.

Keeps the hardcoded landing-page template and its chunked streaming
generator out of the orchestration layer (``llm_service``).
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

from app.services.llm_service import _sse_event

_PLAN_COMMENT = (
    '<!-- PLAN:\n'
    '- Анализ требований и структуры страницы\n'
    '- Создание токен-системы и макета\n'
    '- Вёрстка, стилизация и адаптивность\n'
    '-->'
)

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
      <p>© 2026 Purl.</p>
    </footer>
  </div>
</body>
</html>"""


def _mock_generate_html(prompt: str, theme: str, style: str, plan: bool = False) -> str:
    """Return a hardcoded, beautiful HTML page based on prompt keywords."""
    title = 'Purl AI — Ваш дизайн'
    headline = 'Ваш дизайн — уже готов'
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

    html = _MOCK_TEMPLATE.format(
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
    if plan:
        html = _PLAN_COMMENT + '\n' + html
    return html


async def _stream_mock(full_html: str, intro: str = 'Генерирую макет...\n') -> AsyncGenerator[str]:
    """Yield an existing HTML string in small chunks for a realistic stream."""
    yield _sse_event('code', intro)
    await asyncio.sleep(0.2)
    chunk_size = 50
    for i in range(0, len(full_html), chunk_size):
        yield _sse_event('code', full_html[i : i + chunk_size])
        await asyncio.sleep(0.01)
