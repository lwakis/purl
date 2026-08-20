"""Tests for the new generation features: model selection, plan mode, images, selected element."""

from __future__ import annotations

from helpers import extract_complete_html, parse_sse

from app.config import settings
from app.services.llm_service import ProviderConfig, resolve_provider
from app.services.prompt_service import (
    build_iterate_prompt,
    build_system_prompt,
)
from app.services.providers import _build_user_content, _parse_data_url
from app.utils import hash_prompt

# ── Model resolution ──────────────────────────────────────────────────────────


def test_resolve_provider_model_override_uses_preset(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    provider = resolve_provider('openai:gpt-4o')
    assert provider.name == 'openai'
    assert provider.base_url == 'https://api.openai.com/v1'
    assert provider.model == 'gpt-4o'
    assert provider.api == 'openai'
    assert provider.ready is True


def test_resolve_provider_anthropic_model_override(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    provider = resolve_provider('anthropic:claude-sonnet-4-5')
    assert provider.name == 'anthropic'
    assert provider.api == 'anthropic'
    assert provider.model == 'claude-sonnet-4-5'
    assert provider.ready is True


def test_resolve_provider_ollama_model_override_ready_without_key(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    provider = resolve_provider('ollama:llama3.2')
    assert provider.name == 'ollama'
    assert provider.model == 'llama3.2'
    assert provider.ready is True


def test_resolve_provider_unknown_model_override_falls_back(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    provider = resolve_provider('nonexistent:gpt-4o')
    assert provider.name == 'openai'
    assert provider.model == 'gpt-4o'
    assert provider.ready is False


def test_resolve_provider_invalid_model_format_ignored(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    provider = resolve_provider('openai')
    assert provider.name == 'openai'
    assert provider.model == 'gpt-4o'


def test_resolve_provider_not_ready_override_falls_back(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    provider = resolve_provider('openai:gpt-4o')
    assert provider.ready is False


# ── Plan mode ─────────────────────────────────────────────────────────────────


def test_build_system_prompt_plan_adds_instruction():
    prompt = build_system_prompt('dark', 'techno', plan=True)
    assert 'Before generating code, write a concise markdown plan' in prompt


def test_build_system_prompt_without_plan_has_no_instruction():
    prompt = build_system_prompt('dark', 'techno')
    assert 'Before generating code' not in prompt


# ── Selected element ──────────────────────────────────────────────────────────


def test_build_iterate_prompt_includes_selected_element():
    result = build_iterate_prompt([], '<html>current</html>', 'Сделай синим', 'header')
    assert 'Selected element: header' in result


def test_build_iterate_prompt_without_selected_element():
    result = build_iterate_prompt([], '<html>current</html>', 'Сделай синим')
    assert 'Selected element' not in result


# ── Cache key ─────────────────────────────────────────────────────────────────


def test_hash_prompt_includes_model_and_plan():
    base = hash_prompt('prompt', 'auto', 'minimal')
    assert hash_prompt('prompt', 'auto', 'minimal', model='openai:gpt-4o') != base
    assert hash_prompt('prompt', 'auto', 'minimal', plan=True) != base
    assert hash_prompt('prompt', 'auto', 'minimal', model='openai:gpt-4o', plan=True) != base


# ── Multimodal content ────────────────────────────────────────────────────────


def test_parse_data_url_extracts_media_type_and_raw():
    media_type, raw = _parse_data_url('data:image/png;base64,AAAA')
    assert media_type == 'image/png'
    assert raw == 'AAAA'


def test_build_user_content_plain_string_without_images():
    assert _build_user_content('hello', [], 'openai') == 'hello'
    assert _build_user_content('hello', [], 'anthropic') == 'hello'


def test_build_user_content_openai_multimodal_parts():
    content = _build_user_content('hello', ['data:image/png;base64,AAAA'], 'openai')
    assert content == [
        {'type': 'text', 'text': 'hello'},
        {'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,AAAA'}},
    ]


def test_build_user_content_anthropic_multimodal_parts():
    content = _build_user_content('hello', ['data:image/png;base64,AAAA'], 'anthropic')
    assert content == [
        {'type': 'text', 'text': 'hello'},
        {
            'type': 'image',
            'source': {'type': 'base64', 'media_type': 'image/png', 'data': 'AAAA'},
        },
    ]


class _FakeStreamResponse:
    def __init__(self, lines: list[str]) -> None:
        self._lines = lines

    async def __aenter__(self) -> _FakeStreamResponse:
        return self

    async def __aexit__(self, *exc: object) -> bool:
        return False

    def raise_for_status(self) -> None:
        return None

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class _FakeClient:
    def __init__(self, lines: list[str]) -> None:
        self._lines = lines
        self.captured_body: dict | None = None

    def stream(self, method, endpoint, headers=None, json=None):
        self.captured_body = json
        return _FakeStreamResponse(self._lines)


async def test_stream_provider_sends_openai_multimodal_content(monkeypatch):
    from app.services import providers

    fake = _FakeClient(['data: [DONE]'])

    async def _fake_get_client():
        return fake

    monkeypatch.setattr(providers, '_get_client', _fake_get_client)
    provider = ProviderConfig(
        'openai', 'https://api.openai.com/v1', 'gpt-4o', 'openai', 'sk-test', True
    )
    events = [
        e
        async for e in providers._stream_provider(
            provider, 'sys', 'hello', ['data:image/png;base64,AAAA']
        )
    ]
    assert events == []
    content = fake.captured_body['messages'][1]['content']
    assert content == [
        {'type': 'text', 'text': 'hello'},
        {'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,AAAA'}},
    ]


async def test_stream_provider_plain_string_without_images(monkeypatch):
    from app.services import providers

    fake = _FakeClient(['data: [DONE]'])

    async def _fake_get_client():
        return fake

    monkeypatch.setattr(providers, '_get_client', _fake_get_client)
    provider = ProviderConfig(
        'openai', 'https://api.openai.com/v1', 'gpt-4o', 'openai', 'sk-test', True
    )
    events = [e async for e in providers._stream_provider(provider, 'sys', 'hello')]
    assert events == []
    assert fake.captured_body['messages'][1]['content'] == 'hello'


async def test_stream_anthropic_sends_multimodal_content(monkeypatch):
    from app.services import providers

    fake = _FakeClient(['data: [DONE]'])

    async def _fake_get_client():
        return fake

    monkeypatch.setattr(providers, '_get_client', _fake_get_client)
    provider = ProviderConfig(
        'anthropic',
        'https://api.anthropic.com/v1',
        'claude-sonnet-4-5',
        'anthropic',
        'sk-ant',
        True,
    )
    events = [
        e
        async for e in providers._stream_anthropic(
            provider, 'sys', 'hello', ['data:image/png;base64,AAAA']
        )
    ]
    assert events == []
    content = fake.captured_body['messages'][0]['content']
    assert content == [
        {'type': 'text', 'text': 'hello'},
        {
            'type': 'image',
            'source': {'type': 'base64', 'media_type': 'image/png', 'data': 'AAAA'},
        },
    ]


# ── Endpoint acceptance ───────────────────────────────────────────────────────


def test_generate_accepts_new_fields(client):
    resp = client.post(
        '/api/generate',
        json={
            'prompt': 'Лендинг',
            'model': 'openai:gpt-4o',
            'plan': True,
            'images': ['data:image/png;base64,AAAA'],
        },
    )
    assert resp.status_code == 200
    events = parse_sse(resp.text)
    assert 'complete' in [e['type'] for e in events]


def test_iterate_accepts_new_fields(client):
    current_code = '<!DOCTYPE html>\n<html><body><h1>Hello</h1></body></html>'
    resp = client.post(
        '/api/iterate',
        json={
            'message': 'Сделай кнопку красной',
            'current_code': current_code,
            'model': 'openai:gpt-4o',
            'plan': True,
            'images': ['data:image/png;base64,AAAA'],
            'selected_element': 'header',
        },
    )
    assert resp.status_code == 200
    events = parse_sse(resp.text)
    assert 'complete' in [e['type'] for e in events]


# ── Plan mock output ──────────────────────────────────────────────────────────


def test_generate_plan_prepends_plan_comment_in_mock(client):
    resp = client.post('/api/generate', json={'prompt': 'Лендинг', 'plan': True})
    html = extract_complete_html(resp.text)
    assert html.startswith('<!-- PLAN:')
    assert 'PLAN:' in html


def test_generate_without_plan_has_no_plan_comment(client):
    resp = client.post('/api/generate', json={'prompt': 'Лендинг'})
    html = extract_complete_html(resp.text)
    assert 'PLAN:' not in html


def test_iterate_plan_prepends_plan_comment_in_mock(client):
    current_code = '<!DOCTYPE html>\n<html><body><h1>Hello</h1></body></html>'
    resp = client.post(
        '/api/iterate',
        json={'message': 'Сделай кнопку красной', 'current_code': current_code, 'plan': True},
    )
    html = extract_complete_html(resp.text)
    assert html.startswith('<!-- PLAN:')


# ── Cache behavior ────────────────────────────────────────────────────────────


def test_generate_images_skip_cache(client):
    payload = {'prompt': 'Дашборд', 'theme': 'dark', 'style': 'techno'}
    first = client.post('/api/generate', json={**payload, 'images': ['data:image/png;base64,AAAA']})
    assert first.status_code == 200
    first_html = extract_complete_html(first.text)

    second = client.post(
        '/api/generate', json={**payload, 'images': ['data:image/png;base64,AAAA']}
    )
    assert second.status_code == 200
    events = parse_sse(second.text)
    assert 'code' in [e['type'] for e in events]
    assert extract_complete_html(second.text) == first_html


def test_generate_cache_key_includes_model_and_plan(client):
    payload = {'prompt': 'Дашборд', 'theme': 'dark', 'style': 'techno'}
    first = client.post('/api/generate', json=payload)
    assert first.status_code == 200
    first_html = extract_complete_html(first.text)

    second = client.post('/api/generate', json={**payload, 'model': 'openai:gpt-4o'})
    assert second.status_code == 200
    assert 'code' in [e['type'] for e in parse_sse(second.text)]

    third = client.post('/api/generate', json={**payload, 'plan': True})
    assert third.status_code == 200
    assert 'code' in [e['type'] for e in parse_sse(third.text)]

    fourth = client.post('/api/generate', json=payload)
    assert fourth.status_code == 200
    assert [e['type'] for e in parse_sse(fourth.text)] == ['analysis', 'complete']
    assert extract_complete_html(fourth.text) == first_html
