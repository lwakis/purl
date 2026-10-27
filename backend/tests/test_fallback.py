"""Unit tests for the optional fallback LLM provider."""

import json

from app.config import settings
from app.services import llm_service
from app.services.llm_service import (
    ProviderConfig,
    _sse_event,
    _stream_llm_with_fallback,
    resolve_fallback_provider,
)

_PRIMARY = ProviderConfig(
    'openai',
    'https://api.openai.com/v1',
    'gpt-4o',
    'openai',
    'sk-primary',
    True,
)


def _configure_fallback(
    monkeypatch,
    model='deepseek:deepseek-chat',
    api_key='sk-fallback',
    base_url='',
    provider='openai',
):
    monkeypatch.setattr(settings, 'llm_provider', provider)
    monkeypatch.setattr(settings, 'llm_fallback_model', model)
    monkeypatch.setattr(settings, 'llm_fallback_api_key', api_key)
    monkeypatch.setattr(settings, 'llm_fallback_base_url', base_url)
    monkeypatch.setattr(settings, 'llm_api_key', '')


def _fake_stream(monkeypatch, calls, scripted):
    """Patch ``_stream_llm`` with a recorder replaying *scripted* per provider."""

    async def fake(provider, system_prompt, user_message, images=(), usage=None):
        calls.append(provider.name)
        for sse in scripted.get(provider.name, []):
            yield sse

    monkeypatch.setattr(llm_service, '_stream_llm', fake)


# ── resolve_fallback_provider ────────────────────────────────────────────────


def test_resolve_fallback_preset_uses_fallback_key(monkeypatch):
    _configure_fallback(monkeypatch)
    provider = resolve_fallback_provider()
    assert provider is not None
    assert provider.name == 'deepseek'
    assert provider.base_url == 'https://api.deepseek.com/v1'
    assert provider.model == 'deepseek-chat'
    assert provider.api == 'openai'
    assert provider.api_key == 'sk-fallback'
    assert provider.ready is True


def test_resolve_fallback_different_provider_does_not_inherit_primary_key(monkeypatch):
    _configure_fallback(monkeypatch, api_key='', provider='openai')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-primary')
    assert resolve_fallback_provider() is None


def test_resolve_fallback_uses_target_provider_key(monkeypatch):
    _configure_fallback(monkeypatch, api_key='', provider='openai')
    monkeypatch.setattr(settings, 'deepseek_api_key', 'sk-deepseek')
    provider = resolve_fallback_provider()
    assert provider is not None
    assert provider.api_key == 'sk-deepseek'


def test_resolve_fallback_configured_provider_uses_primary_key(monkeypatch):
    _configure_fallback(monkeypatch, model='openai:gpt-4o-mini', api_key='', provider='openai')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-primary')
    provider = resolve_fallback_provider()
    assert provider is not None
    assert provider.name == 'openai'
    assert provider.api_key == 'sk-primary'


def test_resolve_fallback_explicit_key_wins_over_provider_key(monkeypatch):
    _configure_fallback(monkeypatch, api_key='sk-fallback', provider='openai')
    monkeypatch.setattr(settings, 'deepseek_api_key', 'sk-deepseek')
    provider = resolve_fallback_provider()
    assert provider is not None
    assert provider.api_key == 'sk-fallback'


def test_resolve_fallback_missing_key_is_none(monkeypatch):
    _configure_fallback(monkeypatch, api_key='')
    assert resolve_fallback_provider() is None


def test_resolve_fallback_not_configured_is_none(monkeypatch):
    _configure_fallback(monkeypatch, model='')
    assert resolve_fallback_provider() is None


def test_resolve_fallback_invalid_format_is_none(monkeypatch):
    for value in ('openai', ':gpt-4o', 'openai:', 'unknown:model'):
        _configure_fallback(monkeypatch, model=value)
        assert resolve_fallback_provider() is None, value


def test_resolve_fallback_same_as_primary_is_none(monkeypatch):
    _configure_fallback(monkeypatch, model='openai:gpt-4o')
    assert resolve_fallback_provider(_PRIMARY) is None


def test_resolve_fallback_custom_uses_fallback_base_url(monkeypatch):
    _configure_fallback(
        monkeypatch,
        model='custom:my-model',
        base_url='https://my-llm.example/v1',
    )
    provider = resolve_fallback_provider()
    assert provider is not None
    assert provider.name == 'custom'
    assert provider.base_url == 'https://my-llm.example/v1'
    assert provider.model == 'my-model'
    assert provider.api == 'openai'


def test_resolve_fallback_custom_inherits_primary_base_url(monkeypatch):
    _configure_fallback(monkeypatch, model='custom:my-model', base_url='')
    monkeypatch.setattr(settings, 'llm_base_url', 'https://shared.example/v1')
    provider = resolve_fallback_provider()
    assert provider is not None
    assert provider.base_url == 'https://shared.example/v1'


def test_resolve_fallback_custom_without_base_url_is_none(monkeypatch):
    _configure_fallback(monkeypatch, model='custom:my-model', base_url='')
    monkeypatch.setattr(settings, 'llm_base_url', '')
    assert resolve_fallback_provider() is None


def test_resolve_fallback_ollama_needs_no_key(monkeypatch):
    _configure_fallback(monkeypatch, model='ollama:llama3.2', api_key='')
    provider = resolve_fallback_provider()
    assert provider is not None
    assert provider.name == 'ollama'
    assert provider.ready is True


# ── _stream_llm_with_fallback ────────────────────────────────────────────────


async def test_wrapper_retries_on_retryable_error_before_content(monkeypatch):
    _configure_fallback(monkeypatch)
    calls: list[str] = []
    _fake_stream(
        monkeypatch,
        calls,
        {
            'openai': [_sse_event('error', 'llm_provider_error:503')],
            'deepseek': [
                _sse_event('code', '<html>fallback</html>'),
                _sse_event('complete', '<html>fallback</html>'),
            ],
        },
    )

    events = [
        sse async for sse in _stream_llm_with_fallback(_PRIMARY, 'system', 'user', usage=None)
    ]

    assert calls == ['openai', 'deepseek']
    joined = ''.join(events)
    assert 'fallback' in joined
    types = [json.loads(sse[6:])['type'] for sse in events]
    assert 'error' not in types
    assert types == ['code', 'complete']


async def test_wrapper_forwards_non_retryable_error(monkeypatch):
    _configure_fallback(monkeypatch)
    calls: list[str] = []
    _fake_stream(
        monkeypatch,
        calls,
        {
            'openai': [_sse_event('error', 'llm_provider_error:401')],
            'deepseek': [_sse_event('code', '<html>fallback</html>')],
        },
    )

    events = [sse async for sse in _stream_llm_with_fallback(_PRIMARY, 'system', 'user')]

    assert calls == ['openai']
    assert events == [_sse_event('error', 'llm_provider_error:401')]


async def test_wrapper_forwards_error_after_content(monkeypatch):
    _configure_fallback(monkeypatch)
    calls: list[str] = []
    _fake_stream(
        monkeypatch,
        calls,
        {
            'openai': [
                _sse_event('code', '<html>part'),
                _sse_event('error', 'llm_provider_error:503'),
            ],
            'deepseek': [_sse_event('code', '<html>fallback</html>')],
        },
    )

    events = [sse async for sse in _stream_llm_with_fallback(_PRIMARY, 'system', 'user')]

    assert calls == ['openai']
    types = [json.loads(sse[6:])['type'] for sse in events]
    assert types == ['code', 'error']
    assert 'fallback' not in ''.join(events)


async def test_wrapper_passthrough_without_fallback(monkeypatch):
    _configure_fallback(monkeypatch, model='')
    calls: list[str] = []
    primary_events = [
        _sse_event('error', 'llm_provider_error:503'),
        _sse_event('code', '<html>primary</html>'),
    ]
    _fake_stream(monkeypatch, calls, {'openai': primary_events})

    events = [sse async for sse in _stream_llm_with_fallback(_PRIMARY, 'system', 'user')]

    assert calls == ['openai']
    assert events == primary_events


async def test_wrapper_retries_on_network_error_with_empty_status(monkeypatch):
    _configure_fallback(monkeypatch)
    calls: list[str] = []
    _fake_stream(
        monkeypatch,
        calls,
        {
            'openai': [_sse_event('error', 'llm_provider_error:')],
            'deepseek': [_sse_event('code', '<html>fallback</html>')],
        },
    )

    events = [sse async for sse in _stream_llm_with_fallback(_PRIMARY, 'system', 'user')]

    assert calls == ['openai', 'deepseek']
    assert 'fallback' in ''.join(events)
