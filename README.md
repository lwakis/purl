# Purl

Open-source AI design generator. Type a prompt, get a complete HTML/CSS/JS page, streamed live and previewed in a sandboxed iframe. Iterate on it in a chat until it's right. Similar in spirit to Vercel v0 and Lovable, but self-hostable.

[![CI](https://img.shields.io/github/actions/workflow/status/lwakis/purl/ci.yml)](https://github.com/lwakis/purl/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-%3E%3D3.13-3776AB)
![React](https://img.shields.io/badge/react-18-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![Docker](https://img.shields.io/badge/docker-compose-2496ED)
![Mock mode](https://img.shields.io/badge/mock%20mode-runs%20without%20API%20key-6B7280)

Design at the speed of thought. Purl turns a plain-text description into a working web page: a landing page, a dashboard, a signup form, a pricing page. The backend assembles a system prompt, streams the generation to the browser over Server-Sent Events, and the frontend renders the result in a sandboxed iframe. Keep refining it in a chat, save it as a project, roll back versions, and share a short link with anyone.

Flagship features:

- **Prompt to page.** Describe what you want and get complete, self-contained HTML with inline CSS and JS. Live preview, syntax-highlighted source, copy and download.
- **Iterate by chat.** "Make the buttons bigger", "switch to a dark theme". Purl rewrites the page and the preview updates.
- **Projects and sharing.** Save work as projects, keep a version history, publish a public short link.
- **Mock mode.** With no LLM API key configured, Purl still works end to end. Great for local development, CI, and demos.

## Quickstart

### Docker

```bash
git clone git@github.com:lwakis/purl.git && cd purl
docker compose up --build
```

Then open: frontend at http://localhost:5173, backend at http://localhost:8000 (health check at `/health`, Swagger docs at `/docs`).

No API key required. Leave `LLM_API_KEY` empty and the backend runs in mock mode, generating a local HTML design without any external calls.

### Local development

Backend (Python >= 3.13 and [uv](https://docs.astral.sh/uv/)):

```bash
cd backend
cp .env.example .env
uv sync --extra dev
uv run uvicorn app.main:app --reload --port 8000
```

Frontend (Node.js with npm):

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on port 5173 and proxies `/api` to http://localhost:8000, so the frontend works as-is. See [backend/.env.example](backend/.env.example) for all configuration options.

## How it works

You type a prompt. The backend appends theme and style instructions to a curated system prompt, streams the request to a configured LLM provider (OpenAI-compatible endpoints or Anthropic — see presets below), and relays the response to the browser as Server-Sent Events. The frontend accumulates the streamed HTML and renders it in a sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`), so generated code can never touch the host page. When you ask for changes, the chat history and current code are sent back and the cycle repeats.

## Architecture

```
┌──────────────────────────────┐
│        Frontend (React)      │
│ prompt · preview iframe ·    │
│ chat · code · templates      │
└──────────────┬───────────────┘
               │ HTTP + SSE (JSON)
┌──────────────▼───────────────┐
│      Backend (FastAPI)       │
│ /api/generate · /api/iterate │
│ /api/projects · /api/share   │
│ /api/auth · /api/templates   │
└───┬───────────────────┬──────┘
    │                   │
┌───▼────────┐  ┌───────▼──────────┐
│   SQLite   │  │     LLM          │
│ (aiosqlite)│  │   provider:      │
│   projects │  │  OpenAI-compl. · │
│  versions  │  │   Anthropic      │
│   users    │  └──────────────────┘
│   shares   │
└────────────┘
in-memory: rate limiter · TTL cache
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, zustand, react-syntax-highlighter |
| Backend | Python >= 3.13, FastAPI, SQLAlchemy 2 (async), uvicorn |
| Database | SQLite via aiosqlite |
| Streaming | Server-Sent Events (SSE) |
| LLM | Multi-provider: OpenAI-compatible presets (OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Ollama) + Anthropic, with mock-mode fallback |
| Auth | JWT (pyjwt, HS256), anonymous sessions + email registration |
| Tooling | ruff, pytest, vitest, pre-commit, Docker Compose |

## Project structure

```
purl/
├── backend/                 # FastAPI service
│   ├── app/
│   │   ├── main.py          # entry point, CORS, health checks
│   │   ├── config.py        # pydantic-settings configuration
│   │   ├── database.py      # async SQLAlchemy engine + ORM models
│   │   ├── models.py        # request/response schemas
│   │   ├── prompts.py       # LLM system prompt
│   │   ├── routers/         # auth, generate, projects, share, templates
│   │   └── services/        # LLM client, prompt builder, cache, rate limiter
│   ├── tests/               # pytest + pytest-asyncio
│   ├── .env.example         # environment template
│   └── pyproject.toml       # deps, ruff and pytest config
├── frontend/                # React SPA (Vite)
│   ├── src/
│   │   ├── components/      # preview, code, chat, templates, sidebar
│   │   ├── hooks/           # generation and project hooks
│   │   ├── services/        # API client and SSE reader
│   │   ├── store/           # zustand state
│   │   └── types/           # shared TypeScript types
│   └── package.json
├── .github/workflows/       # CI (lint + tests)
├── LICENSE                  # MIT
├── docker-compose.yml       # one-command startup
└── .pre-commit-config.yaml  # lint and format hooks
```

## Environment variables

All variables are optional; defaults live in `backend/app/config.py`. Copy `backend/.env.example` to `backend/.env` and adjust.

| Variable | Default | Description |
|---|---|---|
| `LLM_API_KEY` | *(empty)* | LLM API key. Empty enables mock mode. |
| `LLM_PROVIDER` | `openai` | Preset: `openai`, `openrouter`, `groq`, `deepseek`, `gemini`, `ollama`, `anthropic`, or `custom` |
| `LLM_BASE_URL` | *(preset)* | Override provider base URL (required for `custom`) |
| `LLM_MODEL` | *(preset)* | Override model (required for `custom`) |
| `LLM_TEMPERATURE` | `0.7` | Sampling temperature |
| `LLM_MAX_TOKENS` | `8192` | Max tokens per response |
| `DATABASE_URL` | `sqlite+aiosqlite:///./purl.db` | Async SQLAlchemy database URL |
| `JWT_SECRET` | dev value | JWT signing secret; rotate in production |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | `1440` | Token lifetime in minutes |
| `RATE_LIMIT_ANON` | `100` | Anonymous requests per hour |
| `RATE_LIMIT_FREE` | `500` | Authenticated requests per hour |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins (JSON array) |
| `MAX_PROMPT_LENGTH` | `2000` | Maximum prompt length in characters |
| `FREE_ITERATIONS_LIMIT` | `10` | Free-plan iteration limit |
| `CACHE_TTL_SECONDS` | `86400` | Result cache TTL in seconds |

## API overview

Interactive docs are served at `/docs` when the backend is running (FastAPI Swagger UI).

| Method | Path | Description |
|---|---|---|
| POST | `/api/generate` | Generate a design; returns an SSE stream |
| POST | `/api/iterate` | Iterate on existing code via chat; SSE stream |
| POST | `/api/auth/anon` | Create an anonymous session (JWT) |
| POST | `/api/auth/register` | Register with email and password |
| POST | `/api/auth/login` | Log in with email and password |
| GET | `/api/projects` | List projects (optionally by `user_id` / `session_id`) |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/{id}` | Get a project |
| PUT | `/api/projects/{id}` | Update a project |
| DELETE | `/api/projects/{id}` | Delete a project and its versions |
| GET | `/api/projects/{id}/versions` | List versions, newest first |
| POST | `/api/projects/{id}/versions` | Save a new version |
| GET | `/api/projects/{id}/versions/{version_id}` | Get one version |
| POST | `/api/share` | Create a short share link |
| GET | `/api/share/{code}` | Get a shared project (public, no auth) |
| GET | `/api/templates` | List starter templates (8, auto-seeded) |
| GET | `/health` | Health check |

### SSE event flow

`/api/generate` streams `data:` frames of JSON:

```
analysis → design → code → complete
```

- `analysis` and `design`: progress messages.
- `code`: chunks of the generated HTML as they arrive.
- `complete`: the final full HTML document.
- `error`: something went wrong.

## Testing and linting

```bash
# Backend (from backend/)
uv run pytest           # run the test suite
uv run ruff check .     # lint
uv run ruff format .    # format

# Frontend (from frontend/)
npx vitest run          # run the test suite
npm run build           # type-check (tsc -b) and build

# Repo root
pre-commit install             # once, to enable hooks
pre-commit run --all-files     # run all hooks
```

## Contributing

Bug reports, feature ideas, and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first: it covers setup, commit conventions, and the PR checklist. All community interactions follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Roadmap

The MVP is shipped: generation, streaming, preview, chat, projects, versions, sharing, templates, auth, and mock mode. Next up is Google OAuth, export formats, and a self-hosted path. See [ROADMAP.md](ROADMAP.md) for the full plan.

## Security

We take security seriously, especially because generated JavaScript is executed in the browser. Please report vulnerabilities privately, never in a public issue. See [SECURITY.md](SECURITY.md) for details.

## License

[MIT](LICENSE) © 2026 Purl AI contributors.
