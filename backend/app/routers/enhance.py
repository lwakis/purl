"""Prompt enhancement endpoint (non-streaming JSON)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.models import EnhancePromptRequest
from app.services.enhance_service import LLMProviderError, enhance_prompt
from app.services.rate_limiter import rate_limiter

router = APIRouter(prefix='/api', tags=['generate'])


def _get_rate_limit_key(request: Request) -> tuple[str, int]:
    """Determine rate-limit bucket and limit for a request."""
    client_ip = request.client.host if request.client else 'unknown'
    return client_ip, settings.rate_limit_per_hour


def _rate_limit_error(retry_after: int) -> JSONResponse:
    """Build a 429 rate-limit error response (same shape as generate)."""
    return JSONResponse(
        status_code=429,
        content={
            'detail': 'Rate limit exceeded. Try again later.',
            'retry_after_seconds': retry_after,
        },
        headers={'Retry-After': str(retry_after)},
    )


@router.post('/enhance-prompt')
async def api_enhance_prompt(req: EnhancePromptRequest, request: Request):
    """Rewrite a short brief into a richer spec for the user to review/edit."""
    rate_key, limit = _get_rate_limit_key(request)
    result = rate_limiter.check(rate_key, limit)
    if not result.allowed:
        return _rate_limit_error(int(result.reset_time))

    try:
        enhanced = await enhance_prompt(
            req.prompt,
            model=req.model,
            session_id=req.session_id,
        )
    except LLMProviderError:
        raise HTTPException(status_code=502, detail='llm_provider_error') from None

    return {'prompt': enhanced}
