"""Production-grade structured request/response logging middleware.

Logs every HTTP request with timing, status, method, path, and user context.
Sensitive fields (Authorization headers, passwords) are safely redacted.
Maintains an in-memory ring buffer for the frontend logging panel.
"""

import collections
import logging
import re
import time
import threading
from datetime import datetime, timezone
from typing import Any

from flask import Flask, g, request

logger = logging.getLogger(__name__)

# Thread-safe ring buffer for recent log entries (max 500)
_LOG_BUFFER_SIZE = 500
_log_lock = threading.Lock()
_log_buffer: collections.deque = collections.deque(maxlen=_LOG_BUFFER_SIZE)

# Fields to redact in request bodies
_REDACT_FIELDS = re.compile(
    r"(password|token|secret|authorization|cookie|api_key|apikey)",
    re.IGNORECASE,
)

# Header keys to redact
_REDACT_HEADERS = {"authorization", "cookie", "x-api-key"}


def _redact_value(key: str, value: Any) -> Any:
    """Redact sensitive values based on field name."""
    if isinstance(key, str) and _REDACT_FIELDS.search(key):
        if isinstance(value, str) and len(value) > 4:
            return value[:2] + "***" + value[-2:]
        return "***"
    return value


def _safe_headers(headers: dict) -> dict:
    """Return headers dict with sensitive values redacted."""
    result = {}
    for key, value in headers.items():
        k_lower = key.lower()
        if k_lower in _REDACT_HEADERS:
            result[key] = "***redacted***"
        else:
            result[key] = value
    return result


def _redact_body(body: Any) -> Any:
    """Recursively redact sensitive fields in request body."""
    if isinstance(body, dict):
        return {k: _redact_value(k, _redact_body(v)) for k, v in body.items()}
    if isinstance(body, list):
        return [_redact_body(item) for item in body]
    return body


def get_log_entries(since_id: int = 0) -> list:
    """Return log entries newer than since_id (for polling)."""
    with _log_lock:
        if since_id == 0:
            return list(_log_buffer)
        return [entry for entry in _log_buffer if entry["id"] > since_id]


def clear_log_entries() -> None:
    """Clear the in-memory log buffer."""
    with _log_lock:
        _log_buffer.clear()


_next_id = 0
_id_lock = threading.Lock()


def _get_next_id() -> int:
    global _next_id
    with _id_lock:
        _next_id += 1
        return _next_id


def register_logging_middleware(app: Flask) -> None:
    """Register before/after request hooks for structured logging."""

    @app.before_request
    def _log_request_start():
        g.request_start_time = time.perf_counter()

    @app.after_request
    def _log_request_end(response):
        duration_ms = 0.0
        start = getattr(g, "request_start_time", None)
        if start is not None:
            duration_ms = (time.perf_counter() - start) * 1000

        # Build structured log entry
        user_email = None
        user_obj = getattr(g, "user", None)
        if user_obj and isinstance(user_obj, dict):
            user_email = user_obj.get("email", "unknown")

        entry = {
            "id": _get_next_id(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 2),
            "user": user_email,
            "remote_addr": request.remote_addr,
            "content_type": request.content_type or "",
            "response_size": response.content_length or 0,
        }

        # Log to standard logger
        level = logging.INFO
        if response.status_code >= 500:
            level = logging.ERROR
        elif response.status_code >= 400:
            level = logging.WARNING

        logger.log(
            level,
            "%s %s -> %d (%.1fms) user=%s",
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            user_email or "anonymous",
        )

        # Add to ring buffer
        with _log_lock:
            _log_buffer.append(entry)

        return response
