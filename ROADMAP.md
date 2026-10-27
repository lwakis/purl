# Roadmap

Legend: `[x]` shipped, `[ ]` planned. This roadmap reflects what is actually in the repository today, separated from what is still on the drawing board. The product spec lives in `PRODUCT.md`; Purl is open-source and self-hostable, so it has no paid gating or SaaS-only features.

## Shipped (MVP)

What's in the repo right now:

### Core generation

- [x] Text prompt to HTML generation (self-contained HTML with inline CSS and JS)
- [x] Streaming output over SSE (`analysis` → `design` → `code` → `complete`)
- [x] Sandboxed iframe preview (`sandbox="allow-scripts"`, no `allow-same-origin`)
- [x] Copy and download HTML
- [x] React export — download the finished page as a ready-to-run Vite + React project (zip)
- [x] Iterative chat on existing designs (history + current code sent with each request)
- [x] Plan mode — a design-planning pass before code generation
- [x] Style presets — seven curated visual directions (`swiss`, `editorial`, `brutalist`, `minimal`, `warm`, `playful`, `retro`; Auto by default) via `GET /api/presets` and the `preset` request field on generate/iterate, stored per project and included in the result-cache key
- [x] Element selection — click a preview element to iterate on it directly
- [x] Reference image attachments — multimodal input (OpenAI and Anthropic wire formats; cache is skipped when images are present)
- [x] Local-first: projects and versions stored in SQLite via the backend (no accounts, no signup)
- [x] Prompt enhancement (`POST /api/enhance-prompt`; deterministic in mock mode)
- [x] Preview runtime-error reporting with a one-click fix through chat
- [x] Find-in-code in the code panel (match counter/navigation, CSS Custom Highlight API; Ctrl/Cmd+F from the keyboard or the command palette)
- [x] Command palette (Ctrl/Cmd+K) for navigation and quick actions

### Models and providers

- [x] Multi-provider LLM layer (OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Ollama, Anthropic, custom OpenAI-compatible endpoint)
- [x] Model selector in the chat UI with a provider catalog (`GET /api/models`), per-request `provider:model` override, and a fallback to the configured default
- [x] Per-provider API keys (`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `CUSTOM_API_KEY`): each provider is ready only with its own key, and `provider:model` overrides use the selected provider's key. `LLM_API_KEY` stays scoped to `LLM_PROVIDER` for existing installs.
- [x] Self-hosted LLM support (Ollama is always ready; `custom` preset for any OpenAI-compatible local endpoint)
- [x] Provider connection test from the model picker (`POST /api/models/test`; mock-aware)
- [x] Optional fallback provider — one retry on network/timeout, 408, 429 or 5xx before any content is streamed (`LLM_FALLBACK_MODEL="provider:model"`)

### Projects

- [x] Project CRUD (`/api/projects`)
- [x] Project search and pagination (server-side `q` search over name/prompt; `page`/`page_size` with a total count and paging controls in the sidebar)
- [x] Version history per project (`/api/projects/{id}/versions`) with restore / download / bookmark from the chat
- [x] Automatic project autosave (no manual Save button)
- [x] Inline project rename
- [x] Version comparison from the snapshots list (side-by-side preview + line diff; restore from the compare view)
- [x] ± diff stats on version cards (against the previous snapshot)
- [x] Project duplication and branching from a version snapshot

### Platform

- [x] In-memory rate limiting (100 req/h per client IP)
- [x] In-memory TTL result cache (prompt hash, 24 h default)
- [x] Persistent result cache (memory + SQLite, survives restarts)
- [x] Mock mode: full end-to-end flow without an LLM API key
- [x] Docker Compose setup, CI workflow, test suites, pre-commit hooks
- [x] All-in-one Docker image published to GHCR (amd64 + arm64 on version tags) — `docker run ghcr.io/lwakis/purl` with no local build
- [x] Optional instance token (`INSTANCE_TOKEN`) — bearer-token gate for `/api/*` with a token screen in the UI; `/health` and `/api/instance` stay public
- [x] Extended health check (`/health`: version, database, mock mode, provider)
- [x] Bundle splitting (react/ui/markdown vendor chunks; none over the 500 kB warning threshold)
- [x] Versioned releases and changelogs (release workflow; tags `v0.1.0`–`v0.8.0` published)
- [x] Open-source documentation (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY)
- [x] Token usage display (`GET /api/usage` keyed by session; in-memory per-session token counts shown in the header — purely informational for self-hosted users who pay for their own LLM API; mock mode reports zero)

## Possible (not committed)

Ideas that may or may not be worth building. Nothing here is a promise.

| Item | Notes |
|---|---|
| [ ] Figma-compatible export | Would need design-token mapping from generated HTML; large effort, unclear payoff for the core use case |
| [ ] Custom system prompts | The curated preset layer shipped (`GET /api/presets`, `preset` on generate/iterate); free-form user-defined generation instructions remain uncommitted |
| [ ] Plugin / theme system | Community themes and generation presets — only if there is a community to serve them |
| [ ] Export to CodeSandbox / StackBlitz | One-click "open in sandbox" — mostly a wrapper around existing download/export, low effort |
| [ ] CLI | Headless generation for scripting and CI |

## Out of scope

Deliberately not planned. Purl stays a self-hostable single-user tool.

| Item | Notes |
|---|---|
| Team workspaces | Multi-user projects and shared access — the product is personal by design |
| Queued generation | Task queue for peak load — a single self-hosted instance does not need it |
| SaaS monetization / paid tiers | No paid gating, no paywalls, no subscriptions — open-source core is the whole product |
| Usage metrics beyond token counts | No analytics, no tracking, no activation/retention/conversion instrumentation |

## How to help

Anything unchecked above is fair game. The best entry points for new contributors are the near-term items and the test suites, which are still thin. See [CONTRIBUTING.md](CONTRIBUTING.md) before starting.
