# ── Stage 1: builder ───────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Install build dependencies needed for some Python packages (e.g. cffi, cryptography)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install dependencies into a virtual environment
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM python:3.11-slim AS production

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi8 \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy the virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source code
COPY --chown=appuser:appgroup . .

# Create directory for ChromaDB persistence
RUN mkdir -p /app/chroma_db && chown -R appuser:appgroup /app/chroma_db

# Create directory for temporary file uploads
RUN mkdir -p /app/tmp_uploads && chown -R appuser:appgroup /app/tmp_uploads

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 8000

# Health check: hit the /health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the FastAPI application with Uvicorn (1 worker for memory limits on Render Free tier)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
