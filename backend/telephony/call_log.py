"""Lightweight JSON-backed call history + dialog log.

Keeps the *Telefonie → Telefonate* tab working without a database migration:
calls and their dialog turns are stored in a single JSON file inside the
persisted ``data/`` directory. This is deliberately simple and in keeping with
the voice project's phonebook store.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
from datetime import datetime, timezone

from backend.config import TELEPHONY_CALLS_PATH

logger = logging.getLogger(__name__)

_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load() -> dict:
    if not os.path.exists(TELEPHONY_CALLS_PATH):
        return {"seq": 0, "calls": []}
    try:
        with open(TELEPHONY_CALLS_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        data.setdefault("seq", 0)
        data.setdefault("calls", [])
        return data
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to read call log; starting empty.")
        return {"seq": 0, "calls": []}


def _save(data: dict) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(TELEPHONY_CALLS_PATH)), exist_ok=True)
    dir_name = os.path.dirname(os.path.abspath(TELEPHONY_CALLS_PATH))
    fd, tmp = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        os.replace(tmp, TELEPHONY_CALLS_PATH)
    except OSError:
        logger.exception("Failed to write call log.")
        try:
            os.unlink(tmp)
        except OSError:
            pass


def _summary(call: dict) -> dict:
    """Return a call without its (potentially large) dialog list."""
    return {k: v for k, v in call.items() if k != "dialog"}


def list_calls() -> list[dict]:
    with _lock:
        data = _load()
    calls = sorted(data["calls"], key=lambda c: c.get("started_at", ""), reverse=True)
    return [_summary(c) for c in calls]


def get_call(call_id: int) -> dict | None:
    with _lock:
        data = _load()
    for call in data["calls"]:
        if call["id"] == call_id:
            return call
    return None


def create_call(direction: str, remote_number: str, status: str = "initiated") -> dict:
    with _lock:
        data = _load()
        data["seq"] += 1
        call = {
            "id": data["seq"],
            "direction": direction,
            "remote_number": remote_number,
            "status": status,
            "started_at": _now(),
            "ended_at": None,
            "duration_seconds": None,
            "summary": None,
            "dialog": [],
        }
        data["calls"].append(call)
        _save(data)
    return call


def add_dialog(call_id: int, role: str, content: str, status: str = "ok") -> dict | None:
    with _lock:
        data = _load()
        for call in data["calls"]:
            if call["id"] == call_id:
                entry = {
                    "id": len(call["dialog"]) + 1,
                    "call_id": call_id,
                    "role": role,
                    "content": content,
                    "timestamp": _now(),
                    "status": status,
                }
                call["dialog"].append(entry)
                _save(data)
                return entry
    return None


def end_call(call_id: int, summary: str | None = None) -> dict | None:
    with _lock:
        data = _load()
        for call in data["calls"]:
            if call["id"] == call_id:
                if call.get("ended_at") is None:
                    call["ended_at"] = _now()
                    try:
                        start = datetime.fromisoformat(call["started_at"])
                        end = datetime.fromisoformat(call["ended_at"])
                        call["duration_seconds"] = int((end - start).total_seconds())
                    except (ValueError, TypeError):
                        call["duration_seconds"] = None
                call["status"] = "ended"
                if summary:
                    call["summary"] = summary
                _save(data)
                return call
    return None
