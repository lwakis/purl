"""Unit tests for utils and prompt_service."""

from app.config import settings
from app.services.llm_service import (
    FenceStripper,
    _sse_event,
    _stream_cleaned_code,
    _strip_code_fences,
    resolve_provider,
)
from app.services.prompt_service import (
    build_generate_prompt,
    build_iterate_prompt,
    build_system_prompt,
)
from app.services.token_usage import TokenUsage, UsageAccumulator, usage_store
from app.utils import hash_prompt, validate_html


def test_validate_html_valid_document_has_no_errors():
    html = '<!DOCTYPE html>\n<html><head></head><body></body></html>'
    assert validate_html(html) == []


def test_validate_html_missing_doctype_reports_error():
    html = '<html><body></body></html>'
    errors = validate_html(html)
    assert any('DOCTYPE' in error for error in errors)


def test_hash_prompt_is_deterministic():
    first = hash_prompt('prompt', 'auto', 'minimal')
    second = hash_prompt('prompt', 'auto', 'minimal')
    assert first == second


def test_hash_prompt_differs_on_theme_and_style():
    base = hash_prompt('prompt', 'auto', 'minimal')
    assert hash_prompt('prompt', 'dark', 'minimal') != base
    assert hash_prompt('prompt', 'auto', 'techno') != base


def test_build_system_prompt_contains_theme_and_style_instructions():
    prompt = build_system_prompt('dark', 'techno')
    assert 'Use a dark color scheme' in prompt
    assert 'neon accents' in prompt


def test_build_generate_prompt_wraps_user_prompt():
    result = build_generate_prompt('My request')
    assert 'My request' in result
    assert 'Create an HTML page from the following description' in result


def test_build_iterate_prompt_contains_code_and_message():
    result = build_iterate_prompt([], '<html>current</html>', 'Сделай синим')
    assert '<html>current</html>' in result
    assert 'Сделай синим' in result


# ── LLM provider resolution ──────────────────────────────────────────────────


def test_resolve_provider_default_openai_not_ready_without_key(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    provider = resolve_provider()
    assert provider.name == 'openai'
    assert provider.api == 'openai'
    assert provider.base_url == 'https://api.openai.com/v1'
    assert provider.model == 'gpt-4o'
    assert provider.ready is False


def test_resolve_provider_openai_ready_with_key(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    provider = resolve_provider()
    assert provider.ready is True
    assert provider.api_key == 'sk-test'


def test_resolve_provider_deepseek_preset(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'deepseek')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    provider = resolve_provider()
    assert provider.api == 'openai'
    assert 'deepseek' in provider.base_url
    assert provider.model == 'deepseek-chat'


def test_resolve_provider_gemini_preset(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'gemini')
    monkeypatch.setattr(settings, 'llm_api_key', 'AIza-test')
    provider = resolve_provider()
    assert provider.api == 'openai'
    assert 'generativelanguage' in provider.base_url
    assert provider.model == 'gemini-2.5-flash'
    assert provider.ready is True


def test_resolve_provider_ollama_ready_without_key(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'ollama')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    provider = resolve_provider()
    assert provider.ready is True
    assert '11434' in provider.base_url


def test_resolve_provider_anthropic_preset(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'anthropic')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-ant-test')
    provider = resolve_provider()
    assert provider.api == 'anthropic'
    assert 'claude' in provider.model


def test_resolve_provider_custom_requires_base_url(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'custom')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    monkeypatch.setattr(settings, 'llm_base_url', '')
    provider = resolve_provider()
    assert provider.ready is False


def test_resolve_provider_custom_uses_override(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'custom')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    monkeypatch.setattr(settings, 'llm_base_url', 'https://my-llm.example/v1')
    monkeypatch.setattr(settings, 'llm_model', 'my-model')
    provider = resolve_provider()
    assert provider.ready is True
    assert provider.base_url == 'https://my-llm.example/v1'
    assert provider.model == 'my-model'


def test_resolve_provider_unknown_name_not_ready(monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'nonexistent')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    provider = resolve_provider()
    assert provider.ready is False


# ── Fence stripper ────────────────────────────────────────────────────────────


def test_strip_code_fences_removes_leading_and_trailing_fences():
    html = '```html\n<!DOCTYPE html>\n<body>hi</body>\n```\n'
    result = _strip_code_fences(html)
    assert result.startswith('<!DOCTYPE html>')
    assert result.endswith('</body>')
    assert '```' not in result


def test_strip_code_fences_removes_mid_document_fences():
    html = '<body>\n```\n<extra>\n```\n</body>'
    assert '<extra>' in _strip_code_fences(html)
    assert '```' not in _strip_code_fences(html)


def test_strip_code_fences_is_idempotent():
    html = '<!DOCTYPE html>\n<body>hi</body>\n'
    once = _strip_code_fences(html)
    assert _strip_code_fences(once) == once


def test_strip_code_fences_handles_bare_python_fence():
    html = '```python\nprint(1)\n```\n'
    result = _strip_code_fences(html)
    assert result == 'print(1)'


def test_fence_stripper_removes_fences_from_single_chunk():
    stripper = FenceStripper()
    chunk = stripper.feed('```html\n<!DOCTYPE html>\n<body>hi</body>\n```\n')
    assert chunk == '<!DOCTYPE html>\n<body>hi</body>\n'
    assert stripper.flush() == ''


def test_fence_stripper_buffers_fence_split_across_chunks():
    stripper = FenceStripper()
    assert stripper.feed('```ht') == ''
    assert stripper.feed('ml\n<body>hi</body>\n') == '<body>hi</body>\n'
    assert stripper.flush() == ''


def test_fence_stripper_drops_closing_fence_in_separate_chunk():
    stripper = FenceStripper()
    assert stripper.feed('```html\n') == ''
    assert stripper.feed('<body>hi</body>\n') == '<body>hi</body>\n'
    assert stripper.feed('```') == ''
    assert stripper.flush() == ''


def test_fence_stripper_passes_plain_html_unchanged():
    stripper = FenceStripper()
    chunk = stripper.feed('<!DOCTYPE html>\n<body>hi</body>\n')
    assert chunk == '<!DOCTYPE html>\n<body>hi</body>\n'
    assert stripper.flush() == ''


def test_fence_stripper_flushes_trailing_partial_line():
    stripper = FenceStripper()
    assert stripper.feed('<body>') == ''
    assert stripper.flush() == '<body>'


async def test_stream_cleaned_code_relays_events_and_cleans_code():
    async def source():
        yield _sse_event('analysis', 'Анализирую ваш запрос...')
        yield _sse_event('code', '```html\n<body>')
        yield _sse_event('code', 'hi</body>\n```\n')
        yield _sse_event('complete', '_DONE_')

    collected = [pair async for pair in _stream_cleaned_code(source())]
    assert collected[0] == (_sse_event('analysis', 'Анализирую ваш запрос...'), '')

    code_pairs = [pair for pair in collected if pair[1]]
    assert code_pairs
    assert code_pairs[-1][1] == '<body>hi</body>\n'

    completes = [pair for pair in collected if pair[0].startswith('data: {"type": "complete"')]
    assert completes[0][0] == _sse_event('complete', '_DONE_')


async def test_stream_cleaned_code_flushes_trailing_tail():
    async def source():
        yield _sse_event('code', '```html\n<body>hi</body>')

    collected = [pair async for pair in _stream_cleaned_code(source())]
    assert collected[-1][1] == '<body>hi</body>'


# ── Token usage tracking ─────────────────────────────────────────────────────


def test_token_usage_total_sums_prompt_and_completion():
    usage = TokenUsage(prompt_tokens=100, completion_tokens=25)
    assert usage.total == 125


def test_token_usage_defaults_to_zero():
    assert TokenUsage().total == 0


def test_usage_accumulator_snapshot_reflects_added_tokens():
    acc = UsageAccumulator()
    acc.add_prompt(50)
    acc.add_completion(30)
    acc.add_completion(10)
    snapshot = acc.snapshot()
    assert snapshot.prompt_tokens == 50
    assert snapshot.completion_tokens == 40
    assert snapshot.total == 90


def test_usage_store_returns_none_for_unknown_session():
    assert usage_store.get('ses-nonexistent') is None


def test_usage_store_get_ignores_missing_session():
    assert usage_store.get(None) is None


def test_usage_store_add_accumulates_across_calls():
    usage_store.add('ses-1', TokenUsage(prompt_tokens=10, completion_tokens=5))
    usage_store.add('ses-1', TokenUsage(prompt_tokens=6, completion_tokens=2))
    usage = usage_store.get('ses-1')
    assert usage is not None
    assert usage.prompt_tokens == 16
    assert usage.completion_tokens == 7


def test_usage_store_keeps_sessions_isolated():
    usage_store.add('ses-a', TokenUsage(prompt_tokens=100, completion_tokens=100))
    usage_store.add('ses-b', TokenUsage(prompt_tokens=1, completion_tokens=2))
    assert usage_store.get('ses-a').total == 200
    assert usage_store.get('ses-b').total == 3


def test_usage_store_add_ignores_empty_session():
    usage_store.add(None, TokenUsage(prompt_tokens=5, completion_tokens=5))
    assert usage_store.get(None) is None
