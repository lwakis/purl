"""API endpoint for starter prompt templates.

Seeds templates on first access if the table is empty. The resolved list is
cached in memory (TTLCache) for ``settings.cache_ttl_seconds`` so subsequent
requests skip the database query.
"""

import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import PromptTemplate, get_db
from app.models import TemplateResponse
from app.services.cache_service import cache

router = APIRouter(prefix='/api/templates', tags=['templates'])

# Fixed key for the in-memory template list cache (JSON-serialized list of dicts).
_TEMPLATES_CACHE_KEY = 'templates:list'

# ── Seed data ────────────────────────────────────────────────────────────────

SEED_TEMPLATES: list[dict[str, str | int]] = [
    {
        'title': 'Лендинг SaaS-продукта',
        'description': 'Одностраничный лендинг для SaaS-продукта с хедером, преимуществами, тарифами и формой',
        'prompt_text': 'Создай современный лендинг для SaaS-продукта. Добавь хедер с логотипом и навигацией, hero-секцию с заголовком и CTA, блок преимуществ (3-4 карточки), секцию с тарифами (3 колонки) и форму обратной связи. Используй градиенты и микро-анимации.',
        'category': 'landing',
        'icon': 'layout',
        'sort_order': 1,
    },
    {
        'title': 'Дашборд аналитики',
        'description': 'Панель управления с графиками, метриками и боковым меню',
        'prompt_text': 'Создай дашборд аналитики с боковым меню (главная, аналитика, пользователи, настройки), верхней панелью с основными метриками (4 карточки KPI), областью с графиками (линейный график и столбчатая диаграмма) и таблицей данных. Тёмная тема.',
        'category': 'dashboard',
        'icon': 'bar-chart',
        'sort_order': 2,
    },
    {
        'title': 'Форма регистрации',
        'description': 'Современная форма регистрации с валидацией и прогресс-баром',
        'prompt_text': 'Создай страницу регистрации с прогресс-баром (3 шага). Первый шаг: имя и email. Второй: пароль и подтверждение. Третий: выбор интересов (чипсы). Добавь валидацию полей в реальном времени, плавные переходы между шагами и красивую иллюстрацию сбоку.',
        'category': 'form',
        'icon': 'edit-3',
        'sort_order': 3,
    },
    {
        'title': 'Pricing Page',
        'description': 'Страница с тремя тарифами, сравнением функций и CTA',
        'prompt_text': 'Создай страницу тарифов с тремя планами (Базовый, Про, Бизнес). Каждый план: название, цена, список функций с галочками, кнопка CTA. Выдели средний план как рекомендуемый. Добавь переключатель месячной/годовой оплаты со скидкой. Внизу — секция сравнения всех функций в таблице.',
        'category': 'pricing',
        'icon': 'dollar-sign',
        'sort_order': 4,
    },
    {
        'title': 'Онбординг',
        'description': 'Пошаговый онбординг с иллюстрациями и индикатором прогресса',
        'prompt_text': "Создай пошаговый онбординг на 4 экрана. Каждый экран: крупная иллюстрация (SVG-иконка), заголовок, описание, индикатор прогресса (точки) и кнопки 'Назад'/'Далее'. Последний шаг — кнопка 'Начать'. Используй плавные слайд-переходы.",
        'category': 'onboarding',
        'icon': 'compass',
        'sort_order': 5,
    },
    {
        'title': 'Блог/Статья',
        'description': 'Статья блога с оглавлением, шапкой и комментариями',
        'prompt_text': 'Создай страницу статьи блога. Добавь шапку с метаданными (автор, дата, категория, время чтения), обложку, содержание статьи с подзаголовками, блок цитаты, изображение с подписью. Внизу — секция комментариев с формой и списком. Справа — боковое меню с оглавлением и похожими статьями.',
        'category': 'content',
        'icon': 'file-text',
        'sort_order': 6,
    },
    {
        'title': 'Портфолио',
        'description': 'Портфолио с сеткой проектов и фильтрацией',
        'prompt_text': "Создай страницу портфолио с фильтрацией по категориям (Все, Веб-дизайн, UI/UX, Брендинг). Сетка проектов в стиле masonry (2-3 колонки). Каждый проект: изображение-обложка, заголовок, категория. При наведении — overlay с кнопкой 'Подробнее'. Добавь модальное окно для детального просмотра.",
        'category': 'portfolio',
        'icon': 'image',
        'sort_order': 7,
    },
    {
        'title': 'Контакты',
        'description': 'Страница контактов с формой и картой',
        'prompt_text': 'Создай страницу контактов с двумя колонками. Слева: контактная информация (адрес, телефон, email, часы работы) с иконками и ссылками на соцсети. Справа: форма обратной связи (имя, email, тема, сообщение) с валидацией. Добавь интерактивную карту (можно placeholder iframe).',
        'category': 'contact',
        'icon': 'map-pin',
        'sort_order': 8,
    },
]


def _serialize_templates(templates: list[PromptTemplate]) -> str:
    return json.dumps(
        [
            {
                'id': t.id,
                'title': t.title,
                'description': t.description,
                'prompt_text': t.prompt_text,
                'category': t.category,
                'icon': t.icon,
            }
            for t in templates
        ],
        ensure_ascii=False,
    )


def _deserialize_templates(payload: str) -> list[TemplateResponse]:
    return [TemplateResponse(**item) for item in json.loads(payload)]


@router.get('', response_model=list[TemplateResponse])
@router.get('/', response_model=list[TemplateResponse])
async def list_templates(db: AsyncSession = Depends(get_db)):  # noqa: B008
    """Return all prompt templates, seeded on first access if empty."""
    cached = cache.get(_TEMPLATES_CACHE_KEY)
    if cached is not None:
        return _deserialize_templates(cached)

    # Check if templates exist
    stmt = select(PromptTemplate).order_by(PromptTemplate.sort_order)
    result = await db.execute(stmt)
    templates = result.scalars().all()

    if not templates:
        # Seed templates
        for data in SEED_TEMPLATES:
            db.add(PromptTemplate(**data))
        await db.flush()
        # Re-fetch
        result = await db.execute(stmt)
        templates = result.scalars().all()

    # Cache only after a successful seed — never cache an empty list.
    payload = _serialize_templates(templates)
    cache.set(_TEMPLATES_CACHE_KEY, payload)
    return _deserialize_templates(payload)
