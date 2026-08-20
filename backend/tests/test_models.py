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


def test_models_ready_reflects_api_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    providers = client.get('/api/models').json()['providers']
    openai = next(p for p in providers if p['id'] == 'openai')
    anthropic = next(p for p in providers if p['id'] == 'anthropic')
    assert openai['ready'] is True
    assert anthropic['ready'] is True


def test_models_custom_requires_base_url_and_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_api_key', 'sk-test')
    monkeypatch.setattr(settings, 'llm_base_url', '')
    providers = client.get('/api/models').json()['providers']
    custom = next(p for p in providers if p['id'] == 'custom')
    assert custom['ready'] is False

    monkeypatch.setattr(settings, 'llm_base_url', 'https://my-llm.example/v1')
    providers = client.get('/api/models').json()['providers']
    custom = next(p for p in providers if p['id'] == 'custom')
    assert custom['ready'] is True


def test_models_custom_uses_configured_model(client, monkeypatch):
    monkeypatch.setattr(settings, 'llm_model', 'my-model')
    providers = client.get('/api/models').json()['providers']
    custom = next(p for p in providers if p['id'] == 'custom')
    assert custom['models'] == [{'id': 'my-model', 'label': 'My-model'}]
