# Purl

**🌐 Язык:** [English](README.md) | Русский

Открытый AI-генератор дизайнов. Введите промпт и получите готовую HTML/CSS/JS страницу: она стримится в реальном времени и отображается в sandboxed iframe. Дорабатывайте результат в чате, пока он не станет таким, как нужно. По духу похож на Vercel v0 и Lovable, но его можно разместить у себя.

[![CI](https://img.shields.io/github/actions/workflow/status/lwakis/purl/ci.yml)](https://github.com/lwakis/purl/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/tag/lwakis/purl?sort=semver)](https://github.com/lwakis/purl/releases)
[![Stars](https://img.shields.io/github/stars/lwakis/purl)](https://github.com/lwakis/purl/stargazers)
[![Last commit](https://img.shields.io/github/last-commit/lwakis/purl)](https://github.com/lwakis/purl/commits/main)
[![Coverage](https://codecov.io/gh/lwakis/purl/branch/main/graph/badge.svg)](https://codecov.io/gh/lwakis/purl)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-%3E%3D3.13-3776AB)
![React](https://img.shields.io/badge/react-19-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-009688)
![Docker](https://img.shields.io/badge/docker-compose-2496ED)
![Mock mode](https://img.shields.io/badge/mock%20mode-runs%20without%20API%20key-6B7280)

Дизайн со скоростью мысли. Purl превращает текстовое описание в работающую веб-страницу: лендинг, дашборд, форму регистрации, страницу с ценами. Бэкенд собирает системный промпт, стримит генерацию в браузер через Server-Sent Events, а фронтенд отображает результат в sandboxed iframe. Дорабатывайте результат в чате, сохраняйте как проект, откатывайте версии и делитесь короткой ссылкой с кем угодно.

Ключевые возможности:

- **От промпта к странице.** Опишите, что нужно, и получите полноценный самодостаточный HTML со встроенными CSS и JS. Живой предпросмотр, подсветка синтаксиса в исходнике, копирование и скачивание.
- **Итерации в чате.** «Сделай кнопки крупнее», «переключи на тёмную тему». Purl переписывает страницу, и предпросмотр обновляется.
- **Проекты и шеринг.** Сохраняйте работу как проекты, ведите историю версий, публикуйте публичную короткую ссылку.
- **Mock-режим.** Без настроенного API-ключа LLM Purl всё равно работает целиком. Отлично подходит для локальной разработки, CI и демо.

## Быстрый старт

### Docker

```bash
git clone git@github.com:lwakis/purl.git && cd purl
docker compose up --build
```

Затем откройте: фронтенд на http://localhost:5173, бэкенд на http://localhost:8000 (health-проверка на `/health`, документация Swagger на `/docs`).

API-ключ не требуется. Оставьте `LLM_API_KEY` пустым, и бэкенд запустится в mock-режиме, генерируя локальный HTML-дизайн без внешних вызовов.

### Локальная разработка

Бэкенд (Python >= 3.13 и [uv](https://docs.astral.sh/uv/)):

```bash
cd backend
cp .env.example .env
uv sync --extra dev
uv run uvicorn app.main:app --reload --port 8000
```

Фронтенд (Node.js с npm):

```bash
cd frontend
npm install
npm run dev
```

Dev-сервер Vite работает на порту 5173 и проксирует `/api` на http://localhost:8000, поэтому фронтенд работает как есть. Все варианты конфигурации смотрите в [backend/.env.example](backend/.env.example).

## Как это работает

Вы вводите промпт. Бэкенд добавляет инструкции по теме и стилю к подобранному системному промпту, стримит запрос в настроенного LLM-провайдера (OpenAI-совместимые эндпоинты или Anthropic, см. пресеты ниже) и передаёт ответ в браузер через Server-Sent Events. Фронтенд накапливает стримленный HTML и рендерит его в sandboxed iframe (`sandbox="allow-scripts"`, без `allow-same-origin`), так что сгенерированный код никогда не сможет коснуться хост-страницы. Когда вы просите внести изменения, история чата и текущий код отправляются обратно, и цикл повторяется.

## Архитектура

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

## Технологический стек

| Слой | Технология |
|---|---|
| Фронтенд | React 19, TypeScript 7, Vite 8, Tailwind CSS, zustand, react-syntax-highlighter |
| Бэкенд | Python >= 3.13, FastAPI, SQLAlchemy 2 (async), uvicorn |
| База данных | SQLite через aiosqlite |
| Стриминг | Server-Sent Events (SSE) |
| LLM | Мультипровайдер: OpenAI-совместимые пресеты (OpenAI, OpenRouter, Groq, DeepSeek, Gemini, Ollama) + Anthropic, с фолбэком на mock-режим |
| Аутентификация | JWT (pyjwt, HS256), анонимные сессии + регистрация по email |
| Инструменты | ruff, pytest, vitest, pre-commit, Docker Compose |

## Структура проекта

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
│   ├── DESIGN.md           # design contract for the app shell
│   ├── src/
│   │   ├── components/      # preview, code, chat, templates, sidebar
│   │   ├── hooks/           # generation and project hooks
│   │   ├── services/        # API client and SSE reader
│   │   ├── store/           # zustand state
│   │   ├── styles/          # global CSS
│   │   └── types/           # shared TypeScript types
│   └── package.json
├── .github/workflows/       # CI (lint + tests)
├── LICENSE                  # MIT
├── docker-compose.yml       # one-command startup
└── .pre-commit-config.yaml  # lint and format hooks
```

## Переменные окружения

Все переменные опциональны; значения по умолчанию лежат в `backend/app/config.py`. Скопируйте `backend/.env.example` в `backend/.env` и настройте под себя.

| Переменная | По умолчанию | Описание |
|---|---|---|
| `LLM_API_KEY` | *(пусто)* | API-ключ LLM. Пустое значение включает mock-режим. |
| `LLM_PROVIDER` | `openai` | Пресет: `openai`, `openrouter`, `groq`, `deepseek`, `gemini`, `ollama`, `anthropic` или `custom` |
| `LLM_BASE_URL` | *(пресет)* | Переопределить базовый URL провайдера (обязательно для `custom`) |
| `LLM_MODEL` | *(пресет)* | Переопределить модель (обязательно для `custom`) |
| `LLM_TEMPERATURE` | `0.7` | Температура сэмплирования |
| `LLM_MAX_TOKENS` | `8192` | Максимум токенов на ответ |
| `DATABASE_URL` | `sqlite+aiosqlite:///./purl.db` | URL async-базы данных для SQLAlchemy |
| `JWT_SECRET` | dev-значение | Секрет подписи JWT; смените на production |
| `JWT_ALGORITHM` | `HS256` | Алгоритм подписи JWT |
| `JWT_EXPIRE_MINUTES` | `1440` | Время жизни токена в минутах |
| `RATE_LIMIT_ANON` | `100` | Анонимные запросы в час |
| `RATE_LIMIT_FREE` | `500` | Запросы аутентифицированных пользователей в час |
| `CORS_ORIGINS` | `["http://localhost:5173","http://localhost:5174","http://127.0.0.1:5173","http://127.0.0.1:5174"]` | Разрешённые CORS-источники (JSON-массив) |
| `MAX_PROMPT_LENGTH` | `2000` | Максимальная длина промпта в символах |
| `FREE_ITERATIONS_LIMIT` | `10` | Лимит итераций на бесплатном плане |
| `CACHE_TTL_SECONDS` | `86400` | TTL кэша результатов в секундах |

### Фронтенд

Env-переменные фронтенда читаются на этапе сборки (`.env` в `frontend/`, см. [frontend/.env.example](frontend/.env.example)).

| Переменная | По умолчанию | Описание |
|---|---|---|
| `VITE_API_BASE_URL` | *(пусто)* | Базовый URL API для запросов fetch/SSE. Пустое значение означает тот же источник, что у фронтенда (dev-прокси Vite или reverse proxy на production). Задавайте только тогда, когда фронтенд и бэкенд живут на разных источниках. |

## Обзор API

Интерактивная документация доступна по адресу `/docs`, когда бэкенд запущен (FastAPI Swagger UI).

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/generate` | Сгенерировать дизайн; возвращает SSE-стрим |
| POST | `/api/iterate` | Доработать существующий код через чат; SSE-стрим |
| POST | `/api/auth/anon` | Создать анонимную сессию (JWT) |
| POST | `/api/auth/register` | Регистрация с email и паролем |
| POST | `/api/auth/login` | Вход с email и паролем |
| GET | `/api/projects` | Список проектов (опционально по `user_id` / `session_id`) |
| POST | `/api/projects` | Создать проект |
| GET | `/api/projects/{id}` | Получить проект |
| PUT | `/api/projects/{id}` | Обновить проект |
| DELETE | `/api/projects/{id}` | Удалить проект и его версии |
| GET | `/api/projects/{id}/versions` | Список версий, сначала новые |
| POST | `/api/projects/{id}/versions` | Сохранить новую версию |
| GET | `/api/projects/{id}/versions/{version_id}` | Получить одну версию |
| POST | `/api/share` | Создать короткую share-ссылку |
| GET | `/api/share/{code}` | Получить расшаренный проект (публично, без аутентификации) |
| GET | `/api/templates` | Список стартовых шаблонов (8, автозаполняются) |
| GET | `/health` | Health-проверка |

### Поток SSE-событий

`/api/generate` стримит `data:` фреймы JSON:

```
analysis → design → code → complete
```

- `analysis` и `design`: сообщения о прогрессе.
- `code`: чанки сгенерированного HTML по мере поступления.
- `complete`: финальный полный HTML-документ.
- `error`: что-то пошло не так.

## Тестирование и линтинг

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

## Участие в разработке

Баг-репорты, идеи фич и pull request'ы приветствуются. Сначала прочитайте [CONTRIBUTING.md](CONTRIBUTING.md): там про настройку окружения, конвенции коммитов и PR-чеклист. Все взаимодействия в комьюнити следуют нашему [Кодексу поведения](CODE_OF_CONDUCT.md).

## Дорожная карта

MVP уже выпущен: генерация, стриминг, предпросмотр, чат, проекты, версии, шеринг, шаблоны, аутентификация и mock-режим. Дальше в планах Google OAuth, экспортные форматы и self-hosted путь. Полный план смотрите в [ROADMAP.md](ROADMAP.md).

## Безопасность

Мы серьёзно относимся к безопасности, особенно потому что сгенерированный JavaScript исполняется в браузере. Сообщайте об уязвимостях приватно, никогда не в публичном issue. Подробности в [SECURITY.md](SECURITY.md).

## Лицензия

[MIT](LICENSE) © 2026 Контрибьюторы Purl AI.
