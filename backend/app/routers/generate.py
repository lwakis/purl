"""API endpoints for design generation and iteration via SSE streaming."""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import GenerateRequest, IterateRequest
from app.services.cache_service import cache
from app.services.llm_service import generate, iterate_stream
from app.services.provider_catalog import list_providers
from app.services.rate_limiter import rate_limiter

router = APIRouter(prefix='/api', tags=['generate'])


@router.get('/models')
async def api_models():
    """List available LLM providers and their models."""
    return {'providers': list_providers()}


def _get_rate_limit_key(request: Request) -> tuple[str, int]:
    """Determine rate-limit bucket and limit for a request."""
    client_ip = request.client.host if request.client else 'unknown'
    return client_ip, settings.rate_limit_per_hour


async def _stream_events(
    event_generator: AsyncGenerator[str],
    request: Request,
) -> AsyncGenerator[str]:
    """Wrap an event generator, checking for client disconnection."""
    async for event in event_generator:
        if await request.is_disconnected():
            break
        yield event


def _build_sse_response(
    generator: AsyncGenerator[bytes],
) -> StreamingResponse:
    """Build a StreamingResponse with proper SSE headers."""
    return StreamingResponse(
        generator,
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )


def _rate_limit_error(retry_after: int) -> StreamingResponse:
    """Build a 429 rate-limit error response."""
    return StreamingResponse(
        content=iter(
            [
                json.dumps(
                    {
                        'detail': 'Rate limit exceeded. Try again later.',
                        'retry_after_seconds': retry_after,
                    }
                ).encode(),
            ]
        ),
        status_code=429,
        media_type='application/json',
        headers={'Retry-After': str(retry_after)},
    )


@router.post('/generate')
async def api_generate(
    req: GenerateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Generate a new design from a text prompt.

    Returns an SSE stream with events: analysis, design, code, complete.
    """
    rate_key, limit = _get_rate_limit_key(request)
    result = rate_limiter.check(rate_key, limit)
    if not result.allowed:
        return _rate_limit_error(int(result.reset_time))

    # Check cache — skipped entirely when images are present (data URLs are huge)
    if not req.images:
        cached_html = cache.get_cached(req.prompt, req.theme, req.style, req.model, req.plan)
        if cached_html is not None:

            async def _cached() -> AsyncGenerator[bytes]:
                yield f'data: {json.dumps({"type": "analysis", "content": "load_from_cache"}, ensure_ascii=False)}\n\n'.encode()
                yield f'data: {json.dumps({"type": "complete", "content": cached_html}, ensure_ascii=False)}\n\n'.encode()

            return _build_sse_response(_cached())

    async def _generate_sse() -> AsyncGenerator[bytes]:
        collected_html: str | None = None
        async for event in _stream_events(
            generate(
                req.prompt,
                req.theme,
                req.style,
                model=req.model,
                plan=req.plan,
                images=req.images,
            ),
            request,
        ):
            line = event if event.endswith('\n') else event + '\n'
            yield line.encode()

            if event.startswith('data: '):
                try:
                    payload = json.loads(event[6:])
                    if payload.get('type') == 'complete':
                        collected_html = payload.get('content', '')
                except (json.JSONDecodeError, IndexError):
                    pass

        if collected_html and not req.images:
            cache.set_cache(req.prompt, req.theme, req.style, collected_html, req.model, req.plan)

    return _build_sse_response(_generate_sse())


@router.post('/iterate')
async def api_iterate(
    req: IterateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Iterate on an existing design.

    Accepts the current code plus a text message describing the change,
    and returns an SSE stream with the updated HTML.
    """
    from app.services.prompt_service import build_system_prompt

    rate_key, limit = _get_rate_limit_key(request)
    result = rate_limiter.check(rate_key, limit)
    if not result.allowed:
        return _rate_limit_error(int(result.reset_time))

    system_prompt = build_system_prompt('auto', 'minimal', plan=req.plan)

    history_dicts: list[dict[str, str]] = [
        {'role': m.role, 'content': m.content} for m in req.history
    ]

    async def _iterate_sse() -> AsyncGenerator[bytes]:
        async for event in _stream_events(
            iterate_stream(
                system_prompt,
                history_dicts,
                req.current_code,
                req.message,
                model=req.model,
                plan=req.plan,
                images=req.images,
                selected_element=req.selected_element,
            ),
            request,
        ):
            line = event if event.endswith('\n') else event + '\n'
            yield line.encode()

    return _build_sse_response(_iterate_sse())
