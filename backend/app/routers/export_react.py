"""React export endpoint (non-streaming JSON)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.models import ReactExportRequest, ReactExportResponse
from app.services.export_react_service import LLMProviderError, convert_to_react
from app.services.rate_limiter import rate_limiter

router = APIRouter(prefix='/api', tags=['export'])


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


@router.post('/export-react', response_model=ReactExportResponse)
async def api_export_react(req: ReactExportRequest, request: Request):
    """Convert a single-file HTML page into one React functional component."""
    rate_key, limit = _get_rate_limit_key(request)
    result = rate_limiter.check(rate_key, limit)
    if not result.allowed:
        return _rate_limit_error(int(result.reset_time))

    try:
        converted = await convert_to_react(req.code, model=req.model)
    except LLMProviderError:
        raise HTTPException(status_code=502, detail='llm_provider_error') from None

    return {'code': converted}
