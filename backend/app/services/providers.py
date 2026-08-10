"""Wire protocols for streaming LLM responses.

One module per family of providers, sharing a single ``httpx.AsyncClient``
owned by ``llm_service`` (see ``_get_client``). No client is created here
per request — the shared client is safe for concurrent streams.
"""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator

from app.config import settings
from app.services.llm_service import ProviderConfig, _get_client, _sse_event


async def _stream_provider(
    provider: ProviderConfig,
    system_prompt: str,
    user_message: str,
) -> AsyncGenerator[str]:
    """Stream HTML tokens from the resolved provider, yielding SSE strings.

    OpenAI-compatible ``/chat/completions`` wire protocol. Individual
    non-fatally malformed frames are skipped.
    """
    endpoint = f'{provider.base_url.rstrip("/")}/chat/completions'

    headers = {
        'content-type': 'application/json',
    }
    if provider.api_key:
        headers['authorization'] = f'Bearer {provider.api_key}'

    body = {
        'model': provider.model,
        'max_tokens': settings.llm_max_tokens,
        'temperature': settings.llm_temperature,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_message},
        ],
        'stream': True,
    }

    client = await _get_client()
    async with client.stream('POST', endpoint, headers=headers, json=body) as response:
        response.raise_for_status()
        async for line in response.aiter_lines():
            if not line.startswith('data: '):
                continue
            payload = line[6:].strip()
            if payload == '[DONE]':
                break
            try:
                event = json.loads(payload)
            except json.JSONDecodeError:
                continue
            choices = event.get('choices', [])
            if not choices:
                continue
            text = choices[0].get('delta', {}).get('content')
            if text:
                yield _sse_event('code', text)


async def _stream_anthropic(
    provider: ProviderConfig,
    system_prompt: str,
    user_message: str,
) -> AsyncGenerator[str]:
    """Stream HTML text from the Anthropic Messages API, yielding SSE."""
    endpoint = f'{provider.base_url.rstrip("/")}/messages'
    body = {
        'model': provider.model,
        'max_tokens': settings.llm_max_tokens,
        'temperature': settings.llm_temperature,
        'system': system_prompt,
        'messages': [{'role': 'user', 'content': user_message}],
        'stream': True,
    }
    headers = {
        'content-type': 'application/json',
        'x-api-key': provider.api_key,
        'anthropic-version': '2023-06-01',
    }

    client = await _get_client()
    async with client.stream('POST', endpoint, headers=headers, json=body) as response:
        response.raise_for_status()
        async for line in response.aiter_lines():
            if not line.startswith('data: '):
                continue
            payload = line[6:].strip()
            if payload in ('[DONE]', 'event: message_stop'):
                break
            try:
                event = json.loads(payload)
            except json.JSONDecodeError:
                continue
            if event.get('type') != 'content_block_delta':
                continue
            delta = event.get('delta') or {}
            text = delta.get('text') if delta.get('type') == 'text_delta' else ''
            if text:
                yield _sse_event('code', text)
