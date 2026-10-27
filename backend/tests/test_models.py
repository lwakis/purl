"""Tests for the GET /api/models provider catalog endpoint."""

from app.config import settings


def test_models_returns_provider_catalog(client):
    resp = client.get('/api/models')
    assert resp.status_code == 200
    providers = resp.json()['providers']

    ids = [p['id'] for p in providers]
    assert 'openai' in ids
    assert 'openrouter' in ids
    assert 'groq' in ids
    assert 'deepseek' in ids
    assert 'gemini' in ids
    assert 'ollama' in ids
    assert 'anthropic' in ids
    assert 'custom' in ids

    openai = next(p for p in providers if p['id'] == 'openai')
    assert openai['name'] == 'OpenAI'
    assert openai['models'] == [{'id': 'gpt-4o', 'label': 'GPT-4o'}]
    assert openai['ready'] is False  # no API key in tests


def test_models_ollama_always_ready(client):
    providers = client.get('/api/models').json()['providers']
    ollama = next(p for p in providers if p['id'] == 'ollama')
    assert ollama['ready'] is True


def test_models_ready_reflects_configured_provider_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'deepseek')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    providers = client.get('/api/models').json()['providers']
    ready = {p['id']: p['ready'] for p in providers}
    assert ready['deepseek'] is True
    assert ready['openai'] is False
    assert ready['anthropic'] is False


def test_models_ready_reflects_provider_specific_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    monkeypatch.setattr(settings, 'groq_api_key', 'sk-test')
    providers = client.get('/api/models').json()['providers']
    ready = {p['id']: p['ready'] for p in providers}
    assert ready['groq'] is True
    assert ready['openai'] is False
    assert ready['deepseek'] is False


def test_models_custom_requires_base_url_and_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'openai')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    monkeypatch.setattr(settings, 'custom_api_key', '')
    monkeypatch.setattr(settings, 'llm_base_url', '')
    providers = client.get('/api/models').json()['providers']
    custom = next(p for p in providers if p['id'] == 'custom')
    assert custom['ready'] is False

    # Base URL alone is not enough.
    monkeypatch.setattr(settings, 'llm_base_url', 'https://my-llm.example/v1')
    providers = client.get('/api/models').json()['providers']
    custom = next(p for p in providers if p['id'] == 'custom')
    assert custom['ready'] is False

    # CUSTOM_API_KEY plus the base URL makes it ready.
    monkeypatch.setattr(settings, 'custom_api_key', 'sk-test')
    providers = client.get('/api/models').json()['providers']
    custom = next(p for p in providers if p['id'] == 'custom')
    assert custom['ready'] is True


def test_models_custom_ready_with_configured_provider_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_provider', 'custom')
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    monkeypatch.setattr(settings, 'custom_api_key', '')
    monkeypatch.setattr(settings, 'llm_base_url', 'https://my-llm.example/v1')
    providers = client.get('/api/models').json()['providers']
    custom = next(p for p in providers if p['id'] == 'custom')
    assert custom['ready'] is True


def test_models_custom_uses_configured_model(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_model', 'my-model')
    providers = client.get('/api/models').json()['providers']
    custom = next(p for p in providers if p['id'] == 'custom')
    assert custom['models'] == [{'id': 'my-model', 'label': 'My-model'}]
