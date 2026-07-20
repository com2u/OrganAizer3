"""Basic, consistent logging configuration for the whole application.

Provides a single :func:`get_logger` helper so every module logs in the same
format. Logging lets us observe application startup, incoming calls, realtime
session creation, call termination and unexpected errors.
"""

from __future__ import annotations

import logging

from .config import config

_CONFIGURED = False


def _configure() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    logging.basicConfig(
        level=getattr(logging, config.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger for the given module name."""
    _configure()
    return logging.getLogger(name)
