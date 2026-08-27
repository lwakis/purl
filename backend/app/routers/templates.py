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
        'title': 'SaaS landing page',
        'description': 'A one-page SaaS landing with header, benefits, pricing and a contact form',
        'prompt_text': 'Create a modern landing page for a SaaS product. Add a header with logo and navigation, a hero section with headline and CTA, a benefits block (3-4 cards), a pricing section (3 columns) and a contact form. Use gradients and micro-animations.',
        'category': 'landing',
        'icon': 'layout',
        'sort_order': 1,
    },
    {
        'title': 'Analytics dashboard',
        'description': 'A control panel with charts, metrics and a sidebar',
        'prompt_text': 'Create an analytics dashboard with a sidebar (home, analytics, users, settings), a top bar with key metrics (4 KPI cards), a charts area (line chart and bar chart) and a data table. Dark theme.',
        'category': 'dashboard',
        'icon': 'bar-chart',
        'sort_order': 2,
    },
    {
        'title': 'Registration form',
        'description': 'A modern sign-up form with validation and a progress bar',
        'prompt_text': 'Create a registration page with a progress bar (3 steps). First step: name and email. Second: password and confirmation. Third: interest selection (chips). Add real-time field validation, smooth transitions between steps and a nice side illustration.',
        'category': 'form',
        'icon': 'edit-3',
        'sort_order': 3,
    },
    {
        'title': 'Pricing page',
        'description': 'A page with three pricing plans, feature comparison and CTA',
        'prompt_text': 'Create a pricing page with three plans (Basic, Pro, Business). Each plan: name, price, a list of features with checkmarks and a CTA button. Highlight the middle plan as recommended. Add a monthly/yearly billing toggle with a discount. At the bottom — a full feature-comparison table.',
        'category': 'pricing',
        'icon': 'dollar-sign',
        'sort_order': 4,
    },
    {
        'title': 'Onboarding flow',
        'description': 'A step-by-step onboarding with illustrations and a progress indicator',
        'prompt_text': 'Create a 4-screen step-by-step onboarding. Each screen: a large illustration (SVG icon), headline, description, a progress indicator (dots) and Back/Next buttons. The last step has a Start button. Use smooth slide transitions.',
        'category': 'onboarding',
        'icon': 'compass',
        'sort_order': 5,
    },
    {
        'title': 'Blog / Article',
        'description': 'A blog article with a table of contents, header and comments',
        'prompt_text': 'Create a blog article page. Add a header with metadata (author, date, category, reading time), a cover image, the article body with subheadings, a quote block and an image with a caption. At the bottom — a comments section with a form and a list. On the right — a sidebar with a table of contents and related articles.',
        'category': 'content',
        'icon': 'file-text',
        'sort_order': 6,
    },
    {
        'title': 'Portfolio',
        'description': 'A portfolio with a project grid and filtering',
        'prompt_text': 'Create a portfolio page with category filtering (All, Web Design, UI/UX, Branding). A masonry-style project grid (2-3 columns). Each project: cover image, title and category. On hover — an overlay with a Details button. Add a modal for detailed viewing.',
        'category': 'portfolio',
        'icon': 'image',
        'sort_order': 7,
    },
    {
        'title': 'Contact page',
        'description': 'A contact page with a form and a map',
        'prompt_text': 'Create a contact page with two columns. Left: contact information (address, phone, email, opening hours) with icons and social links. Right: a contact form (name, email, subject, message) with validation. Add an interactive map (a placeholder iframe is fine).',
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
