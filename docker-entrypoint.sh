#!/bin/sh
set -e

# Load configuration (defaults match .env / backend/config.py)
WEB_HOST="${WEB_HOST:-0.0.0.0}"
WEB_PORT="${WEB_PORT:-4815}"
DB_PATH="${DB_PATH:-data/terminlandschaft.db}"

echo "=== Terminlandschaft (Docker) ==="

# Ensure the data directory exists
mkdir -p "$(dirname "$DB_PATH")"

# Import the schedule on first start (when the database is missing)
if [ ! -f "$DB_PATH" ]; then
    echo "No database found at $DB_PATH - importing schedule.xlsx ..."
    python -m backend.main import schedule.xlsx
fi

echo "Starting server on http://${WEB_HOST}:${WEB_PORT}"

# Serve the Flask app via Gunicorn (production WSGI server)
exec gunicorn \
    --bind "${WEB_HOST}:${WEB_PORT}" \
    --workers "${GUNICORN_WORKERS:-2}" \
    --timeout "${GUNICORN_TIMEOUT:-600}" \
    "backend.server:create_app()"
