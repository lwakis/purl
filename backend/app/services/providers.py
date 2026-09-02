"""Wire protocols for streaming LLM responses.

One module per family of providers, sharing a single ``httpx.AsyncClient``
owned by ``llm_service`` (see ``_get_client``). No client is created here
per request — the shared client is safe for concurrent streams.
"""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator, Sequence

from app.config import settings
from app.services.llm_service import ProviderConfig, _get_client, _sse_event
from app.services.token_usage import UsageAccumulator


def _parse_data_url(data_url: str) -> tuple[str, str]:
    """Split a base64 data URL into ``(media_type, raw_base64)``.

    ``data:image/png;base64,AAAA...`` -> ``('image/png', 'AAAA...')``.
    """
    prefix, sep, raw = data_url.partition(',')
    if not sep:
        return 'image/png', data_url
    media_type = prefix.removeprefix('data:').split(';')[0]
    return media_type or 'image/png', raw


def _build_user_content(
    user_message: str,
    images: Sequence[str],
    api: str,
) -> str | list[dict[str, object]]:
    """Build the user message content, adding multimodal parts for images.

    With no images the plain string is returned unchanged (existing behavior).
    OpenAI-compatible providers get ``image_url`` parts; Anthropic gets
    ``image`` parts carrying the raw base64 payload.
    """
    if not images:
        return user_message
    parts: list[dict[str, object]] = [{'type': 'text', 'text': user_message}]
    if api == 'anthropic':
        for data_url in images:
            media_type, raw = _parse_data_url(data_url)
            parts.append(
                {
                    'type': 'image',
                    'source': {'type': 'base64', 'media_type': media_type, 'data': raw},
                }
            )
    else:
        for data_url in images:
            parts.append({'type': 'image_url', 'image_url': {'url': data_url}})
    return parts


async def _stream_provider(
    provider: ProviderConfig,
    system_prompt: str,
    user_message: str,
    images: Sequence[str] = (),
    usage: UsageAccumulator | None = None,
) -> AsyncGenerator[str]:
    """Stream HTML tokens from the resolved provider, yielding SSE strings.

    OpenAI-compatible ``/chat/completions`` wire protocol. Individual
    non-fatally malformed frames are skipped. When *usage* is provided, the
    provider is asked to include a usage frame (``stream_options.include_usage``)
    and its token counts are accumulated into *usage* as they arrive.
    """
    endpoint = f'{provider.base_url.rstrip("/")}/chat/completions'

    headers = {
        'content-type': 'application/json',
    }
    if provider.api_key:
        headers['authorization'] = f'Bearer {provider.api_key}'

    body: dict[str, object] = {
        'model': provider.model,
        'max_tokens': settings.llm_max_tokens,
        'temperature': settings.llm_temperature,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': _build_user_content(user_message, images, 'openai')},
        ],
        'stream': True,
    }
    if usage is not None:
        # Ask the provider to append a final usage frame so we can count tokens.
        body['stream_options'] = {'include_usage': True}

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
            if usage is not None:
                usage_frame = event.get('usage')
                if isinstance(usage_frame, dict):
                    prompt = usage_frame.get('prompt_tokens') or 0
                    completion = usage_frame.get('completion_tokens') or 0
                    if prompt or completion:
                        usage.add_prompt(prompt)
                        usage.add_completion(completion)
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
    images: Sequence[str] = (),
    usage: UsageAccumulator | None = None,
) -> AsyncGenerator[str]:
    """Stream HTML text from the Anthropic Messages API, yielding SSE."""
    endpoint = f'{provider.base_url.rstrip("/")}/messages'
    body = {
        'model': provider.model,
        'max_tokens': settings.llm_max_tokens,
        'temperature': settings.llm_temperature,
        'system': system_prompt,
        'messages': [
            {'role': 'user', 'content': _build_user_content(user_message, images, 'anthropic')}
        ],
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
            if usage is not None:
                _accumulate_anthropic_usage(event, usage)
            if event.get('type') != 'content_block_delta':
                continue
            delta = event.get('delta') or {}
            text = delta.get('text') if delta.get('type') == 'text_delta' else ''
            if text:
                yield _sse_event('code', text)


def _accumulate_anthropic_usage(event: dict, usage: UsageAccumulator) -> None:
    """Record token counts from Anthropic ``message_start`` / ``message_delta`` events."""
    event_type = event.get('type')
    if event_type == 'message_start':
        msg = event.get('message') or {}
        prompt_tokens = (msg.get('usage') or {}).get('input_tokens') or 0
        output_tokens = (msg.get('usage') or {}).get('output_tokens') or 0
        if prompt_tokens or output_tokens:
            usage.add_prompt(prompt_tokens)
            usage.add_completion(output_tokens)
    elif event_type == 'message_delta':
        # Only the cumulative output_tokens arrive here.
        output_tokens = (event.get('usage') or {}).get('output_tokens') or 0
        if output_tokens:
            usage.add_completion(output_tokens)
