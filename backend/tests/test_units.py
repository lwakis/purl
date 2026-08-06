"""Unit tests for utils and prompt_service."""

from app.config import settings
from app.services.llm_service import resolve_provider
from app.services.prompt_service import (
    build_generate_prompt,
    build_iterate_prompt,
    build_system_prompt,
)
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
    assert 'тёмную цветовую схему' in prompt
    assert 'неоновыми' in prompt


def test_build_generate_prompt_wraps_user_prompt():
    result = build_generate_prompt('Мой запрос')
    assert 'Мой запрос' in result
    assert 'HTML-страницу' in result


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
