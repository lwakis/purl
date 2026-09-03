"""Pydantic models for request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

# ── Attachments ──────────────────────────────────────────────────────────────

MAX_IMAGES = 8
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def validate_images(value: list[str]) -> list[str]:
    """Validate multimodal image attachments (base64 data URLs).

    Mirrors the client-side limits enforced in ``ChatPanel.tsx`` so direct
    API callers meet the same contract: at most ``MAX_IMAGES`` entries, each
    an ``image/*`` data URL no larger than ``MAX_IMAGE_BYTES`` once decoded.
    """
    if len(value) > MAX_IMAGES:
        raise ValueError(f'At most {MAX_IMAGES} images are allowed')
    for url in value:
        prefix, sep, raw = url.partition(',')
        if not sep or not raw or not prefix.startswith('data:image/'):
            raise ValueError('Each image must be a data:image/* URL')
        # Decoded size without allocating the payload: every group of 4 base64
        # chars encodes 3 bytes; each trailing '=' marks one byte less.
        decoded = (len(raw) // 4) * 3 - raw[-2:].count('=')
        if decoded > MAX_IMAGE_BYTES:
            raise ValueError(f'Each image must be at most {MAX_IMAGE_BYTES} bytes after decoding')
    return value


# ── Generation ───────────────────────────────────────────────────────────────


class GenerateRequest(BaseModel):
    prompt: str = Field(..., max_length=2000, description='User prompt describing the design')
    theme: Literal['light', 'dark', 'auto'] = 'auto'
    style: Literal['minimal', 'corporate', 'playful', 'techno'] = 'minimal'
    session_id: str | None = Field(None, description='Client-generated browser session identifier')
    model: str | None = Field(None, description='Provider override in "provider:model" format')
    plan: bool = Field(False, description='Ask the model to plan before generating code')
    images: list[str] = Field(
        default_factory=list, description='Base64 data URLs for multimodal input'
    )

    _check_images = field_validator('images')(validate_images)


class IterateRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(..., max_length=2000)
    current_code: str
    history: list[ChatMessage] = Field(default_factory=list)
    model: str | None = Field(None, description='Provider override in "provider:model" format')
    plan: bool = Field(False, description='Ask the model to plan before generating code')
    images: list[str] = Field(
        default_factory=list, description='Base64 data URLs for multimodal input'
    )
    selected_element: str | None = Field(
        None, description='Element the user clicked for iteration context'
    )

    _check_images = field_validator('images')(validate_images)


class ChatMessage(BaseModel):
    role: Literal['user', 'assistant']
    content: str


# ── API responses ────────────────────────────────────────────────────────────


class GenerateResponse(BaseModel):
    session_id: str | None = None
    event_type: str
    data: str


class ProjectResponse(BaseModel):
    id: int
    name: str
    prompt: str | None = None
    current_code: str | None = None
    theme: str = 'auto'
    style: str = 'minimal'
    session_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {'from_attributes': True}


class ProjectVersionResponse(BaseModel):
    id: int
    project_id: int
    version_num: int
    code: str | None = None
    message: str | None = None
    created_at: datetime | None = None

    model_config = {'from_attributes': True}


class PaginatedProjects(BaseModel):
    """Paginated project listing envelope returned by ``GET /api/projects``.

    Carries the page slice plus the total number of matching projects so the
    client can render paging without a separate count request.
    """

    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int


class ProjectCreate(BaseModel):
    name: str = 'Untitled'
    prompt: str | None = None
    current_code: str | None = None
    session_id: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    prompt: str | None = None
    current_code: str | None = None
    theme: str | None = None
    style: str | None = None


class ProjectVersionCreate(BaseModel):
    code: str
    message: str | None = None


class TemplateResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    prompt_text: str
    category: str | None = None
    icon: str | None = None

    model_config = {'from_attributes': True}
