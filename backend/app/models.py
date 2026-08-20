"""Pydantic models for request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

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
