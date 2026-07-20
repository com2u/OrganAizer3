"""Configuration for the Terminlandschaft backend.

All important system configuration is read from environment variables,
which are loaded from a `.env` file in the project root.
"""

import logging
import os

from dotenv import load_dotenv

PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))


def _resolve_path(value: str) -> str:
    """Resolve a possibly relative path against the project root."""
    if os.path.isabs(value):
        return value
    return os.path.join(PROJECT_ROOT, value)


# Web Server
WEB_PORT = int(os.environ.get("WEB_PORT", 4815))
WEB_HOST = os.environ.get("WEB_HOST", "0.0.0.0")
FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() in ("1", "true", "yes")

# CORS - allowed frontend origins (comma separated in .env, or "*" for all)
_DEFAULT_CORS_ORIGINS = ",".join(
    [
        # local development
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:4815",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4815",
        # AI backend server
        "http://167.235.156.114",
        "http://167.235.156.114:4815",
        # developer workstation (by hostname)
        "http://com2u-ThinkPad-T580",
        "http://com2u-ThinkPad-T580:5173",
        "http://com2u-ThinkPad-T580:4815",
        # production frontend
        "https://organaizer.app",
        "http://organaizer.app",
    ]
)
_cors_raw = os.environ.get("CORS_ORIGINS", _DEFAULT_CORS_ORIGINS).strip()
CORS_ORIGINS = (
    "*"
    if _cors_raw == "*"
    else [o.strip() for o in _cors_raw.split(",") if o.strip()]
)

# Authentication - OpenWebUI is used as the identity/login backend
AUTH_ENABLED = os.environ.get("AUTH_ENABLED", "true").lower() in ("1", "true", "yes")
OPENWEBUI_URL = os.environ.get(
    "OPENWEBUI_URL", "https://openwebui.ai-server.org"
).rstrip("/")

# Obsidian Vault root (host-mounted directory; container path configured via env)
OBSIDIAN_ROOT = os.environ.get("OBSIDIAN_ROOT", "/app/obsidian")

# Database
DB_PATH = _resolve_path(
    os.environ.get("DB_PATH", os.path.join("data", "terminlandschaft.db"))
)
CONFIG_PATH = _resolve_path(
    os.environ.get("CONFIG_PATH", os.path.join("data", "organaizer-config.json"))
)

# Logging
LOG_LEVEL = getattr(logging, os.environ.get("LOG_LEVEL", "DEBUG").upper(), logging.DEBUG)
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
LOG_FILE = _resolve_path(os.environ.get("LOG_FILE", "log.txt"))


def setup_logging():
    """Configure logging for the application."""
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(LOG_LEVEL)

    # Create formatter
    formatter = logging.Formatter(LOG_FORMAT)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler for debug messages
    file_handler = logging.FileHandler(LOG_FILE, mode="a")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
