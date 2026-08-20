"""Provider/model catalog for the GET /api/models endpoint."""

from __future__ import annotations

from app.config import LLM_PRESETS, settings

_PROVIDER_NAMES: dict[str, str] = {
    'openai': 'OpenAI',
    'openrouter': 'OpenRouter',
    'groq': 'Groq',
    'deepseek': 'DeepSeek',
    'gemini': 'Gemini',
    'ollama': 'Ollama',
    'anthropic': 'Anthropic',
    'custom': 'Custom',
}


def _humanize_model(model_id: str) -> str:
    """Return a human-readable label for a model id.

    Strips a leading org prefix (``openai/gpt-4o`` -> ``gpt-4o``), capitalizes
    the first word, and uppercases known model-family acronyms
    (``gpt-4o`` -> ``GPT-4o``).
    """
    name = model_id.split('/')[-1]
    head, sep, rest = name.partition('-')
    if head in {'gpt', 'o1', 'o3', 'o4'}:
        head = head.upper()
    elif head:
        head = head[0].upper() + head[1:]
    return head + sep + rest


def list_providers() -> list[dict[str, object]]:
    """Return the provider/model catalog for GET /api/models.

    Each preset contributes its default model; ``custom`` uses the configured
    ``LLM_MODEL``. ``ollama`` is always ready; every other provider is ready
    only when an API key is configured (``custom`` additionally needs a base URL).
    """
    providers: list[dict[str, object]] = []
    for key, (_base_url, default_model, _api) in LLM_PRESETS.items():
        ready = key == 'ollama' or bool(settings.llm_api_key)
        providers.append(
            {
                'id': key,
                'name': _PROVIDER_NAMES.get(key, key.title()),
                'models': [{'id': default_model, 'label': _humanize_model(default_model)}],
                'ready': ready,
            }
        )
    custom_model = settings.llm_model or 'gpt-4o'
    providers.append(
        {
            'id': 'custom',
            'name': 'Custom',
            'models': [{'id': custom_model, 'label': _humanize_model(custom_model)}],
            'ready': bool(settings.llm_base_url) and bool(settings.llm_api_key),
        }
    )
    return providers
