# Roadmap

Legend: `[x]` shipped, `[ ]` planned. This roadmap reflects what is actually in the repository today, separated from what is still on the drawing board. The product spec lives in `PRODUCT.md`; Purl is open-source and self-hostable, so it has no paid gating or SaaS-only features.

## Shipped (MVP)

What's in the repo right now:

### Core generation

- [x] Text prompt to HTML generation (self-contained HTML with inline CSS and JS)
- [x] Streaming output over SSE (`analysis` → `design` → `code` → `complete`)
- [x] Sandboxed iframe preview (`sandbox="allow-scripts"`, no `allow-same-origin`)
- [x] Copy and download HTML
- [x] Iterative chat on existing designs (history + current code sent with each request)
- [x] Plan mode — a design-planning pass before code generation
- [x] Element selection — click a preview element to iterate on it directly
- [x] Reference image attachments — multimodal input (OpenAI and Anthropic wire formats; cache is skipped when images are present)
- [x] Local-first: projects and versions stored in SQLite via the backend (no accounts, no signup)

### Models and providers

- [x] Multi-provider LLM layer (OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Ollama, Anthropic, custom OpenAI-compatible endpoint)
- [x] Model selector in the chat UI with a provider catalog (`GET /api/models`), per-request `provider:model` override, and a fallback to the configured default
- [x] Self-hosted LLM support (Ollama is always ready; `custom` preset for any OpenAI-compatible local endpoint)

### Projects

- [x] Project CRUD (`/api/projects`)
- [x] Version history per project (`/api/projects/{id}/versions`) with restore / download / bookmark from the chat
- [x] Automatic project autosave (no manual Save button)
- [x] Inline project rename
- [x] Template catalog API with 8 seeded starter prompts (`GET /api/templates`; backend-only — the gallery UI was removed in the hero-prompt redesign)

### Platform

- [x] In-memory rate limiting (100 req/h per client IP)
- [x] In-memory TTL result cache (prompt hash, 24 h default)
- [x] Mock mode: full end-to-end flow without an LLM API key
- [x] Docker Compose setup, CI workflow, test suites, pre-commit hooks
- [x] Versioned releases and changelogs (release workflow; tags `v0.1.0`/`v0.2.0` published)
- [x] Open-source documentation (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY)

## v1.1 (next)

| Item | Notes |
|---|---|
| [ ] Project search and pagination | The sidebar lists all projects; no search or limits yet |
| [ ] Template favorites / saved prompts | `PromptTemplate` has no per-session relation yet |
| [ ] React export | The UI has a placeholder button ("export in React coming soon"); backend has no JSX output |
| [ ] Token usage display | Track tokens spent per session/project — useful for self-hosted users who pay for their own LLM API; purely informational, for a single user |

## Possible (not committed)

Ideas that may or may not be worth building. Nothing here is a promise.

| Item | Notes |
|---|---|
| [ ] Figma-compatible export | Would need design-token mapping from generated HTML; large effort, unclear payoff for the core use case |
| [ ] Custom system prompts | User-defined generation instructions; useful for power users who run their own models |
| [ ] Plugin / theme system | Community themes and generation presets — only if there is a community to serve them |
| [ ] Persistent prompt cache | The cache is in-memory today; a persistent store would survive restarts (SQLite is already a dependency, so this is small) |
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

Anything unchecked above is fair game. The best entry points for new contributors are the v1.1 items and the test suites, which are still thin. See [CONTRIBUTING.md](CONTRIBUTING.md) before starting.
