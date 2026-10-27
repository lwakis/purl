"""API endpoints for design generation and iteration via SSE streaming."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.models import GenerateRequest, IterateRequest, PresetListResponse
from app.presets import presets_payload
from app.services.cache_service import cache
from app.services.llm_service import (
    _stream_llm,
    generate,
    iterate_stream,
    resolve_provider,
)
from app.services.provider_catalog import list_providers
from app.services.rate_limiter import rate_limiter
from app.services.token_usage import usage_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api', tags=['generate'])


# ── Provider connection test ─────────────────────────────────────────────────


class ModelTestRequest(BaseModel):
    """Request body for the provider connection test."""

    model: str | None = None


class ModelTestResponse(BaseModel):
    """Result of a provider connection test."""

    ok: bool
    reason: str
    provider: str | None = None
    model: str | None = None


_TEST_SYSTEM_PROMPT = 'You are a connection test. Reply with the single word: OK.'
_TEST_USER_MESSAGE = 'ping'
_TEST_TIMEOUT_SECONDS = 20


@router.get('/models')
async def api_models():
    """List available LLM providers and their models."""
    return {'providers': list_providers()}


@router.get('/presets', response_model=PresetListResponse)
async def api_presets():
    """List curated style presets (metadata only; fragments stay server-side)."""
    return {'presets': presets_payload()}


@router.get('/usage')
async def api_usage(session_id: str):
    """Return cumulative token usage for a session."""
    usage = usage_store.get(session_id)
    if usage is None:
        return {}
    return {
        'input': usage.prompt_tokens,
        'output': usage.completion_tokens,
        'total': usage.total,
    }


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


async def _probe_provider(provider) -> None:
    """Send one minimal completion through the streaming LLM path.

    Returns as soon as the first content chunk arrives (that is all a
    connection test needs). Raises on a provider error event or any transport
    failure so the caller can report ``ok=False``.
    """
    async for sse in _stream_llm(provider, _TEST_SYSTEM_PROMPT, _TEST_USER_MESSAGE):
        if not sse.startswith('data: '):
            continue
        try:
            payload = json.loads(sse[6:])
        except (json.JSONDecodeError, IndexError):
            continue
        event_type = payload.get('type')
        if event_type == 'error':
            raise RuntimeError(payload.get('content', 'llm_provider_error'))
        if event_type == 'code' and payload.get('content'):
            return


@router.post('/models/test')
async def api_models_test(req: ModelTestRequest, request: Request):
    """Test connectivity to the configured (or requested) LLM provider.

    Never fails the request: any provider error or timeout is reported as
    ``{ok: false, reason: "error"}`` with HTTP 200.
    """
    rate_key, limit = _get_rate_limit_key(request)
    result = rate_limiter.check(rate_key, limit)
    if not result.allowed:
        return _rate_limit_error(int(result.reset_time))

    provider = resolve_provider(req.model)

    if not provider.ready:
        return ModelTestResponse(ok=True, reason='mock', provider=None, model=None)

    try:
        await asyncio.wait_for(_probe_provider(provider), timeout=_TEST_TIMEOUT_SECONDS)
    except Exception as exc:  # noqa: BLE001 — any failure maps to ok=False
        logger.warning('Provider connection test failed for %s: %s', provider.name, exc)
        return ModelTestResponse(
            ok=False, reason='error', provider=provider.name, model=provider.model
        )

    return ModelTestResponse(ok=True, reason='ok', provider=provider.name, model=provider.model)


@router.post('/generate')
async def api_generate(
    req: GenerateRequest,
    request: Request,
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
        preset_key = req.preset or ''
        cached_html = await cache.aget_cached(req.prompt, req.model, req.plan, preset_key)
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
                model=req.model,
                plan=req.plan,
                images=req.images,
                session_id=req.session_id,
                preset=req.preset,
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
            await cache.aset_cache(
                req.prompt, collected_html, req.model, req.plan, req.preset or ''
            )

    return _build_sse_response(_generate_sse())


@router.post('/iterate')
async def api_iterate(
    req: IterateRequest,
    request: Request,
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

    system_prompt = build_system_prompt(plan=req.plan, preset=req.preset)

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
                session_id=req.session_id,
            ),
            request,
        ):
            line = event if event.endswith('\n') else event + '\n'
            yield line.encode()

    return _build_sse_response(_iterate_sse())
