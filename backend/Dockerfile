FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Create a non-root user for running the app
RUN groupadd --system purl && \
    useradd --system --gid purl --create-home purl

# Copy backend sources
COPY pyproject.toml ./
COPY app ./app

# Install setuptools explicitly (pyproject.toml has no [build-system] section,
# so legacy setuptools auto-discovery is used), then install the package.
RUN pip install --no-cache-dir setuptools && \
    pip install --no-cache-dir .

# Directory for the SQLite database (named volume mount target)
RUN mkdir -p /app/data && \
    chown -R purl:purl /app

USER purl

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
