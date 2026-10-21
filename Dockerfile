# syntax=docker/dockerfile:1

# ── Stage 1: build the React app ─────────────────────────────────────────────
FROM node:22-alpine AS frontend

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: all-in-one runtime (FastAPI + built SPA) ────────────────────────
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create a non-root user for running the app
RUN groupadd --system purl && \
    useradd --system --gid purl --create-home purl

WORKDIR /app

# Backend sources
COPY backend/pyproject.toml ./
COPY backend/app ./app

# Install setuptools explicitly (pyproject.toml has no [build-system] section,
# so legacy setuptools auto-discovery is used), then install the package.
RUN pip install --no-cache-dir setuptools && \
    pip install --no-cache-dir .

# Built frontend assets, served by FastAPI from `/app/static` (mounted at `/`
# after every API route).
COPY --from=frontend /app/dist ./static

# Directory for the SQLite database (named volume mount target)
RUN mkdir -p /app/data && \
    chown -R purl:purl /app

USER purl

ENV DATABASE_URL=sqlite+aiosqlite:////app/data/purl.db

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
