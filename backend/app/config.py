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

    # ── Rate limiting ─────────────────────────────────────────────────────
    rate_limit_anon: int = 100  # requests / hour
    rate_limit_free: int = 500  # requests / hour

    # ── CORS ──────────────────────────────────────────────────────────────
    cors_origins: list[str] = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
    ]

    # ── Limits ────────────────────────────────────────────────────────────
    max_prompt_length: int = 2000
    free_iterations_limit: int = 10

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
