# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Curated style presets: seven visual directions — `swiss`, `editorial`, `brutalist`, `minimal`, `warm`, `playful` and `retro` — append a visual-direction fragment to the fixed system prompt without replacing the base generation contract; `preset=null` is Auto (no fragment). `GET /api/presets` returns localized `id`, `name` and `description` plus a 3-color `swatch` per preset, while the internal prompt fragment stays private. `preset` is accepted by `POST /api/generate` and `POST /api/iterate`, is part of the result-cache key, and is stored on projects (`preset` on project JSON/create/update). The landing prompt input gains preset chips and the workspace chat a compact picker; selection applies per generation/iteration.

### Changed

- Per-provider API keys: `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` and `CUSTOM_API_KEY` enable their own provider in the model picker, and a `provider:model` override uses the selected provider's key. `LLM_API_KEY` remains the key for `LLM_PROVIDER` and is never forwarded to a different provider; existing single-key installs keep working. A fallback to another provider also needs that provider's key or an explicit `LLM_FALLBACK_API_KEY`.
- `custom:<model>` model-picker overrides now resolve against `LLM_BASE_URL` and `CUSTOM_API_KEY` (or the configured custom provider's key) instead of silently falling back to the default provider.

### Fixed

- The model picker no longer marks every provider ready when only `LLM_API_KEY` is set, and selecting a different provider can no longer send the configured provider's key to it.

## [0.8.0] - 2026-10-21

### Added

- Instance token: `INSTANCE_TOKEN` requires `Authorization: Bearer <token>` on every `/api/*` route (constant-time compare), while `GET /health` and the new public `GET /api/instance` bootstrap (`{auth_required, authenticated, version}`) stay open. The web UI shows a Darkroom token screen, stores the token in the browser and sends it with every API and SSE request; any 401 locks the workspace again.
- Fallback provider: `LLM_FALLBACK_MODEL="provider:model"` (with `LLM_FALLBACK_API_KEY` and `LLM_FALLBACK_BASE_URL`) retries once with a secondary endpoint when the primary fails before any content is streamed — network/timeout errors and HTTP 408, 429, 500, 502, 503 or 504. Auth errors, other 4xx and mid-stream failures surface unchanged, and the fallback is skipped when it resolves to the same endpoint. It applies to generate, iterate, prompt enhancement and React export.
- Single all-in-one Docker image: `ghcr.io/lwakis/purl` builds the SPA and serves it from FastAPI on port 8000 with SQLite in `/app/data`, so `docker run` needs no local build. A `Docker` workflow publishes `linux/amd64` + `linux/arm64` images on `v*` tags (semver and `latest`).

### Changed

- `docker-compose.yml` now runs the single `purl` service (published image or a local build from the same Dockerfile); the documented quick start uses the GHCR image on port 8000.

### Removed

- The split `backend/Dockerfile` / `frontend/Dockerfile` images and the frontend nginx config, replaced by the all-in-one image.

## [0.7.0] - 2026-10-21

### Changed

- React export now ships a runnable project: `POST /api/export-react` returns an `application/zip` attachment with a ready-to-run Vite + React project — `package.json`, `index.html`, `vite.config.js`, `src/main.jsx`, `src/App.jsx`, `README.md` and `.gitignore` — instead of JSON with a single component, and the code-panel button downloads `<project>.zip`. Archives are byte-for-byte deterministic, the source page `<title>` is carried into `index.html`, and mock mode embeds the page verbatim so the project builds without a provider.

## [0.6.0] - 2026-10-19

### Added

- React export: `POST /api/export-react` converts the current page into a single `.jsx` component — CSS embedded as a template literal, scripts as hooks — and the code-panel button downloads it as `<project>.jsx` (mock mode returns a deterministic wrapper).

### Removed

- The `theme`/`style` generation parameters: styling is now driven entirely by the prompt — the frontend sends neither, the backend no longer injects theme/style instructions into the system prompt, and projects no longer store them.
- The unused `/api/templates` endpoint, the `PromptTemplate` table/model and the `TemplateResponse` schema (the frontend never called the endpoint).

## [0.5.0] - 2026-10-19

### Added

- Command palette: `Ctrl`/`Cmd`+`K` opens a keyboard-driven palette — switch between preview and code, find in code, copy or download the HTML, switch the language, open the projects sidebar, or cancel a running generation.
- Project duplication and branching: `POST /api/projects/{id}/duplicate` copies a project with its full version history; `POST /api/projects/{id}/versions/{version_id}/branch` starts a new project from any snapshot.
- Provider connection test: `POST /api/models/test` probes the resolved provider (mock-aware); the model picker gains a "Test connection" action.
- Extended `GET /health`: reports `version`, `database`, `mock_mode` and the resolved `provider` (still backwards compatible).
- Compare-flow polish: restore a snapshot straight from the comparison view; version cards show `+added / −removed` stats against the previous snapshot.
- Quick find: `Ctrl`/`Cmd`+`F` opens find-in-code from the keyboard.

### Changed

- Bundle splitting: vendor code ships in cacheable chunks (`vendor-react`, `vendor-ui`, `vendor-markdown`); no chunk exceeds the 500 kB warning threshold anymore (largest ≈ 211 kB).

## [0.4.0] - 2026-10-18

### Added

- Persistent result cache: generated pages are cached in memory and SQLite, so results survive backend restarts; database failures degrade to memory-only.
- Prompt enhancement: `POST /api/enhance-prompt` rewrites a short brief into a richer, concrete spec before generating (deterministic in mock mode); the hero input gains an "Improve prompt" action.
- Find in code: a search bar in the code panel with a match counter, Enter/Shift+Enter navigation, Escape to close, and CSS Custom Highlight API highlighting with a graceful fallback.
- Version comparison: compare any two snapshots — or a snapshot against the current code — from the snapshots list, with side-by-side sandboxed previews and a line diff with added/removed stats.
- Preview error reporting: uncaught runtime errors in the sandboxed preview surface a banner with a one-click fix that starts a normal chat iteration.

## [0.3.0] - 2026-08-20

### Added

- Model picker: a `GET /api/models` endpoint returns the provider catalog; the frontend lets you choose a model (or reset to auto).
- Plan mode: ask for a plan before code (`plan: true` on generate/iterate).
- Image attachments: up to 8 images / 5 MB each, sent to the LLM as multimodal content.
- Element selection: click an element in the preview iframe to iterate on it directly (`selected_element`).
- Simplified top bar: the omnibox and settings/help placeholders were removed.

### Changed

- Rate limiting is now a single per-IP limit (`RATE_LIMIT_PER_HOUR`) instead of two tiers keyed by browser session id (`RATE_LIMIT_ANON` / `RATE_LIMIT_SESSION`).

## [0.2.0] - 2026-08-10

### Changed

- Projects are now saved automatically as you work (debounced, like chats in AI assistants); the manual Save button and the Save dialog were removed.
- Fixed the gray row background in the code panel: the syntax-highlighter override no longer paints every code line gray.
- `POST /api/projects/{id}/versions` now accepts `code` and `message` in the JSON body instead of URL query parameters (generated HTML can exceed URL length limits).
- Split `llm_service.py` into orchestration, mock-mode HTML generation, and provider wire protocols; a single shared `httpx.AsyncClient` is reused across requests instead of one per request.
- Prompt templates are cached in memory (TTL 24 h) instead of being re-read from the database on every request.

### Removed

- User accounts, email registration/login, and JWT authentication (the `/api/auth` endpoints and users table) were removed: Purl is now a fully anonymous, self-hostable tool. Projects are scoped per browser via a client-generated session id.

## [0.1.0] - 2026-08-06

### Added

- Prompt-to-HTML design generation with SSE streaming (`analysis` → `design` → `code` → `complete`)
- Sandboxed iframe preview (`sandbox="allow-scripts"`, no `allow-same-origin`)
- Iterative chat on existing designs with history and current code
- Multi-provider LLM client: OpenAI-compatible presets (OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Ollama) + Anthropic, streaming, with mock fallback
- Projects with CRUD and version history
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