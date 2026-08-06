# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The project is in pre-release. This section tracks work that has landed on the default branch and will be part of the first release.

### Added

- Prompt-to-HTML design generation with SSE streaming (`analysis` → `design` → `code` → `complete`)
- Sandboxed iframe preview (`sandbox="allow-scripts"`, no `allow-same-origin`)
- Iterative chat on existing designs with history and current code
- Projects with CRUD, version history, and public share links (short codes)
- Starter template gallery (8 templates, auto-seeded on first access)
- Anonymous JWT sessions and email registration/login
- In-memory rate limiting (anonymous 100 req/h, authenticated 500 req/h)
- In-memory TTL result cache keyed by prompt hash
- Mock mode: the backend runs end to end without an LLM API key
- Multi-provider LLM client: OpenAI-compatible presets (OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Ollama) + Anthropic, streaming, with mock fallback
- Docker Compose setup for one-command startup
- CI workflow (lint and tests)
- Test suites for backend (pytest + pytest-asyncio) and frontend (vitest)
- Pre-commit hooks (ruff, formatting, YAML/JSON checks, large-file guard)
- Open-source documentation: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, ROADMAP, CHANGELOG

### Changed

- Project renamed from Stitch to Purl.

### Fixed

- Nothing yet; no released versions to fix.

### Security

- Generated code is isolated in a sandboxed iframe without same-origin access.
- Secrets are excluded from version control (`.env` is gitignored).
- See [SECURITY.md](SECURITY.md) for the full threat model and reporting process.

## [0.1.0] - not yet released

No tagged release exists yet. The backend reports version `0.1.0` internally, but no versioned release has been cut. This entry is reserved for the first tag.
