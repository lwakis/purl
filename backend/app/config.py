"""Application configuration via pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or defaults."""

    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    # ── Database ──────────────────────────────────────────────────────────
    database_url: str = 'sqlite+aiosqlite:///./purl.db'

    # ── LLM Provider (optional — system falls back to mock mode) ───────────
    llm_provider: str = 'openai'
    llm_api_key: str = ''
    llm_base_url: str = ''
    llm_model: str = ''
    llm_temperature: float = 0.7
    llm_max_tokens: int = 8192

    # ── Per-provider API keys (optional, scoped to their provider) ─────────
    # Env names: OPENAI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY,
    # DEEPSEEK_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, CUSTOM_API_KEY.
    # LLM_API_KEY above remains as a legacy fallback for LLM_PROVIDER only.
    openai_api_key: str = ''
    openrouter_api_key: str = ''
    groq_api_key: str = ''
    deepseek_api_key: str = ''
    gemini_api_key: str = ''
    anthropic_api_key: str = ''
    custom_api_key: str = ''

    # ── Fallback provider (optional) ──────────────────────────────────────
    # "provider:model" used when the primary provider fails before streaming.
    # Example: openrouter:openai/gpt-4o (needs LLM_FALLBACK_API_KEY).
    llm_fallback_model: str = ''
    llm_fallback_api_key: str = ''
    llm_fallback_base_url: str = ''

    # ── Instance protection ───────────────────────────────────────────────
    # When set, every /api/* route requires `Authorization: Bearer <token>`.
    instance_token: str = ''

    # ── Rate limiting ─────────────────────────────────────────────────────
    rate_limit_per_hour: int = 100  # requests / hour per client IP

    # ── CORS ──────────────────────────────────────────────────────────────
    cors_origins: list[str] = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
    ]

    # ── Limits ────────────────────────────────────────────────────────────
    max_prompt_length: int = 2000

    # ── Cache ─────────────────────────────────────────────────────────────
    cache_ttl_seconds: int = 86_400  # 24 hours


# Provider presets: canonical name -> (base URL, default model, wire protocol).
# 'api' is one of 'openai' (OpenAI-compatible /chat/completions) or 'anthropic'
# (Anthropic Messages /v1/messages).
LLM_PRESETS: dict[str, tuple[str, str, str]] = {
    'openai': ('https://api.openai.com/v1', 'gpt-4o', 'openai'),
    'openrouter': ('https://openrouter.ai/api/v1', 'openai/gpt-4o', 'openai'),
    'groq': ('https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', 'openai'),
    'deepseek': ('https://api.deepseek.com/v1', 'deepseek-chat', 'openai'),
    'gemini': (
        'https://generativelanguage.googleapis.com/v1beta/openai',
        'gemini-2.5-flash',
        'openai',
    ),
    'ollama': ('http://localhost:11434/v1', 'llama3.2', 'openai'),
    'anthropic': ('https://api.anthropic.com/v1', 'claude-sonnet-4-5', 'anthropic'),
}


settings = Settings()


_PROVIDER_KEY_FIELDS: dict[str, str] = {
    'openai': 'openai_api_key',
    'openrouter': 'openrouter_api_key',
    'groq': 'groq_api_key',
    'deepseek': 'deepseek_api_key',
    'gemini': 'gemini_api_key',
    'anthropic': 'anthropic_api_key',
    'custom': 'custom_api_key',
}


def api_key_for_provider(provider: str) -> str:
    """Return the API key scoped to *provider*, or ``''`` when none is set.

    A provider-specific setting always wins. ``LLM_API_KEY`` is only used as a
    legacy fallback for the provider named by ``LLM_PROVIDER``, so a single key
    can never leak to a different provider. ``ollama`` never needs a key.

    Reads from the live ``settings`` object so tests can monkeypatch it.
    """
    name = provider.lower()
    if name == 'ollama':
        return ''
    field = _PROVIDER_KEY_FIELDS.get(name)
    if field:
        key = getattr(settings, field)
        if key:
            return key
    if name == settings.llm_provider.lower():
        return settings.llm_api_key
    return ''
