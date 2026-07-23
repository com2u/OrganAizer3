# syntax=docker/dockerfile:1

# ---------- Stage 1: Build the React frontend ----------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Install dependencies first for better layer caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Build the frontend
COPY frontend/ ./
RUN npm run build


# ---------- Stage 2: Python backend runtime ----------
FROM python:3.12-slim AS runtime

# Do not buffer stdout/stderr so logs show up immediately
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies: yt-dlp, ffmpeg, tesseract-ocr, deno (for yt-dlp JS), curl, unzip
RUN apt-get update && apt-get install -y --no-install-recommends \
    yt-dlp \
    ffmpeg \
    tesseract-ocr \
    tesseract-ocr-deu \
    tesseract-ocr-eng \
    tesseract-ocr-fra \
    tesseract-ocr-spa \
    tesseract-ocr-ita \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Upgrade yt-dlp to nightly for better YouTube compatibility (JS challenge solver)
RUN pip install --no-cache-dir --upgrade --pre "yt-dlp[default]"

# Install Deno (JavaScript runtime needed by yt-dlp for YouTube extraction)
RUN curl -fsSL https://deno.land/install.sh | sh
ENV PATH="/root/.deno/bin:${PATH}"

# Install Python dependencies first for better layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy backend source and the initial schedule data
COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY schedule.xlsx ./schedule.xlsx

# Copy the built frontend from the first stage
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Entry point handles first-time data import, then starts the server
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# The port is configurable via the WEB_PORT env var (default 4815)
EXPOSE 4815

ENTRYPOINT ["docker-entrypoint.sh"]
