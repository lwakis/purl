# Contributing to Purl

Thanks for wanting to help. This guide covers how to set up a development environment, how to structure commits and pull requests, and what the maintainers expect from a contribution.

Before anything else, read the [README](README.md) for an overview, and the [Code of Conduct](CODE_OF_CONDUCT.md). All contributions are expected to follow both.

## Development environment

### Option A: Docker

```bash
docker compose up --build
```

Frontend lands on http://localhost:5173, backend on http://localhost:8000. This works without an LLM API key because the backend falls back to mock mode.

### Option B: Local

Backend (Python >= 3.13, [uv](https://docs.astral.sh/uv/)):

```bash
cd backend
cp .env.example .env
uv sync --extra dev
uv run uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to http://localhost:8000, so no extra configuration is needed.

### Environment and mock mode

All backend settings come from environment variables; see `backend/.env.example` and `backend/app/config.py`. The important one:

- `LLM_API_KEY` empty (or unset) means **mock mode**: the backend generates a local HTML design with no external API calls. This is the default for local development and CI.
- Set a real key and pick `LLM_PROVIDER` to hit a live model. Presets: `openai`, `openrouter`, `groq`, `deepseek`, `gemini`, `ollama` (no key needed), `anthropic`, or `custom` (any OpenAI-compatible endpoint via `LLM_BASE_URL`/`LLM_MODEL`).

Never commit a real `.env` file. The repo's `.gitignore` already excludes it.

## Branch and commit conventions

- Work on a feature branch, not on `main`. Name it after what you're doing, for example `feat/project-search` or `fix/rate-limit-window`.
- Keep commits small and focused. One logical change per commit.
- Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add project search
fix: reset rate-limit window on restart
docs: clarify mock mode in README
test: cover project version rollback
refactor: extract prompt builder from llm service
chore: bump ruff to 0.6.9
```

- Write commit messages in the imperative mood ("add", "fix", not "added", "fixed").
- Reference issues where relevant: `fix: handle empty prompt (#42)`.

## Pull request checklist

Before opening a PR, make sure all of the following pass:

- [ ] Backend tests pass: `uv run pytest` (from `backend/`)
- [ ] Ruff is clean: `uv run ruff check .` and `uv run ruff format .`
- [ ] Frontend tests pass: `npx vitest run` (from `frontend/`)
- [ ] TypeScript strict build passes: `npm run build` (runs `tsc -b`)
- [ ] Pre-commit hooks pass: `pre-commit run --all-files`
- [ ] New behavior is covered by a test where practical
- [ ] No secrets, keys, or `.env` files in the diff
- [ ] CHANGELOG updated under `[Unreleased]` if the change is user-visible

If a checklist item doesn't apply, say so in the PR description rather than leaving it unchecked.

## Issue etiquette

- Search existing issues and PRs before opening a new one. Duplicates get closed.
- Use a clear, specific title. "It doesn't work" is not a title.
- For bugs, include: what you did, what you expected, what happened, and the environment (OS, Python/Node versions, mock mode or real API key).
- For feature requests, describe the problem you're solving, not just the feature you want.
- Be patient and kind. Maintainers and contributors are volunteers.

## Where to contribute

The [ROADMAP](ROADMAP.md) is the source of truth for what's planned. Good starting points:

- **v1.1 items**: project search, template favorites, React export.
- **Open source growth**: self-hosted LLM support (Ollama), plugin/theme system, CodeSandbox/StackBlitz export, CLI.
- **Quality**: the test suites are still thin. Adding tests for the routers, the rate limiter, and the cache is high-value and low-risk.
- **Docs**: the docs are new. Typos, clarifications, and examples are always welcome.

If you want to pick something up, say so in the issue thread so nobody else starts the same work.

## Code style

### Backend (Python)

- Ruff is the linter and formatter. Config lives in `backend/pyproject.toml`.
- Line length: 100 characters.
- Strings: single quotes (enforced by `ruff format`).
- Type hints on all public functions and methods. The codebase targets Python >= 3.13, so modern syntax (`str | None`, `from __future__ import annotations`) is fine.
- Async-first: the app is built on FastAPI and async SQLAlchemy. Don't add blocking calls to request paths.
- Keep modules small. If a file is growing past a few hundred lines, split it.

### Frontend (TypeScript/React)

- TypeScript runs in strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`). The build fails on unused code.
- Components live in `frontend/src/components/`, state in `frontend/src/store/`, API and SSE plumbing in `frontend/src/services/`.
- Tailwind CSS for styling. Follow the existing dark, surface-based design tokens.
- The preview iframe must stay sandboxed: `sandbox="allow-scripts"` and never `allow-same-origin`. This is a security boundary, not a style choice.

## Getting help

Open an issue on GitHub with the `question` label, or ask in the discussion section of the repository. If it's a security matter, use the process in [SECURITY.md](SECURITY.md) instead of a public issue.
