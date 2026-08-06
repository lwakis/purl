# Roadmap

Legend: `[x]` shipped, `[ ]` planned. This roadmap is derived from the product spec (`PRODUCT.md`) and reflects what is actually in the repository today, separated from what is still on the drawing board.

## Shipped (MVP)

What's in the repo right now:

### Core generation

- [x] Text prompt to HTML generation (self-contained HTML with inline CSS and JS)
- [x] Streaming output over SSE (`analysis` → `design` → `code` → `complete`)
- [x] Sandboxed iframe preview (`sandbox="allow-scripts"`, no `allow-same-origin`)
- [x] Copy, download HTML, and download as ZIP
- [x] Iterative chat on existing designs (history + current code sent with each request)
- [x] Anonymous usage without registration (JWT sessions via `/api/auth/anon`)

### Projects and sharing

- [x] Project CRUD (`/api/projects`)
- [x] Version history per project (`/api/projects/{id}/versions`)
- [x] Public share links with short codes (`/api/share`)
- [x] Template gallery with 8 seeded starter prompts (`/api/templates`)

### Platform

- [x] Email registration and login
- [x] In-memory rate limiting (anonymous 100 req/h, authenticated 500 req/h)
- [x] In-memory TTL result cache (prompt hash, 24 h default)
- [x] Mock mode: full end-to-end flow without an LLM API key
- [x] Docker Compose setup, CI workflow, test suites, pre-commit hooks
- [x] Open-source documentation (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY)

## v1.1 (next)

| Item | Notes |
|---|---|
| [ ] Google OAuth sign-in | The `User` model already has an `auth_provider` column ready for `"google"` |
| [ ] Password hashing upgrade | Move from SHA-256 to bcrypt/argon2 before production |
| [ ] Share link expiry and revoke | Links are currently permanent once created |
| [ ] Project search and pagination | The sidebar lists all projects; no search or limits yet |
| [ ] Fork a shared project | The spec describes a "Fork" action on shared previews; the API returns the code, the UI button doesn't exist yet |
| [ ] Template favorites / saved prompts | `PromptTemplate` has no per-user relation yet |
| [ ] React export | The UI has a placeholder button ("export in React coming soon"); backend has no JSX output |

## Later

| Item | Notes |
|---|---|
| [ ] React/JSX component export | Spec: paid-plan feature |
| [ ] Reference image upload | Screenshot, logo, or brand colors as generation input |
| [ ] Figma-compatible export | Spec: roadmap item |
| [ ] Team workspaces | Multi-user projects and shared team access |
| [ ] Custom system prompts | For agencies; user-defined generation instructions |
| [ ] Queued generation | Spec mentions a task queue for peak load |

## Open source growth

Ideas that matter for the project as an open-source product:

| Item | Notes |
|---|---|
| [ ] Self-hosted LLM support | e.g. Ollama or any OpenAI-compatible local endpoint. The provider layer already ships Ollama and `custom` presets |
| [ ] Plugin / theme system | Community themes and generation presets |
| [ ] Export to CodeSandbox / StackBlitz | One-click "open in sandbox" from the code panel |
| [ ] Persistent prompt cache | The cache is in-memory today; a persistent store would survive restarts and share results across instances |
| [ ] CLI | Headless generation for scripting and CI |
| [ ] Usage metrics | Generation counts, iteration depth, share rate (activation, retention, conversion) |
| [ ] CI badge and release automation | Publish versioned releases and automated changelogs after the first tag |

## How to help

Anything unchecked above is fair game. The best entry points for new contributors are the v1.1 items and the test suites, which are still thin. See [CONTRIBUTING.md](CONTRIBUTING.md) before starting.
