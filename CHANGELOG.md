# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Projects are now saved automatically as you work (debounced, like chats in AI assistants); the manual Save button and the Save dialog were removed.
- Fixed the gray row background in the code panel: the syntax-highlighter override no longer paints every code line gray.

### Removed

- User accounts, email registration/login, and JWT authentication (the `/api/auth` endpoints and users table) were removed: Purl is now a fully anonymous, self-hostable tool. Projects are scoped per browser via a client-generated session id.
- Public share links (short codes): the `/api/share` endpoints, the Share dialog, the Share view, and the `share_links` table were removed because the feature was not working.

## [0.1.0] - 2026-08-06

### Added

- Prompt-to-HTML design generation with SSE streaming (`analysis` → `design` → `code` → `complete`)
- Sandboxed iframe preview (`sandbox="allow-scripts"`, no `allow-same-origin`)
- Iterative chat on existing designs with history and current code
- Multi-provider LLM client: OpenAI-compatible presets (OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Ollama) + Anthropic, streaming, with mock fallback
- Projects with CRUD, version history, and public share links (short codes)
- Starter template gallery (8 templates, auto-seeded on first access)
- In-memory rate limiting (100 req/h without a browser session id, 500 req/h with one)
- In-memory TTL result cache keyed by prompt hash
- Mock mode: the backend runs end to end without an LLM API key
- Docker Compose setup for one-command startup
- CI workflow (lint, tests, coverage upload)
- Test suites for backend (pytest + pytest-asyncio) and frontend (vitest)
- Pre-commit hooks (ruff, formatting, YAML/JSON checks, large-file guard)
- Open-source documentation: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, ROADMAP, CHANGELOG

### Changed

- Project renamed from Stitch to Purl.

### Security

- Generated code is isolated in a sandboxed iframe without same-origin access.
- Secrets are excluded from version control (`.env` is gitignored).
- See [SECURITY.md](SECURITY.md) for the full threat model and reporting process.