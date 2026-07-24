"""Manage the persisted Slidev Markdown project."""

from pathlib import Path

from flask import Blueprint, jsonify, request

from backend import auth
from backend.integration_config import INTEGRATIONS_DIR

slidev_bp = Blueprint("slidev", __name__)
SLIDES = INTEGRATIONS_DIR.parent / "slidev" / "slides.md"
DEFAULT = """---
theme: default
title: OrganAIzer Präsentation
---

# OrganAIzer Präsentation

Mit Markdown und Slidev erstellt.

---

## Nächste Folie

- Inhalt bearbeiten
- Speichern
- Präsentation starten
"""


@slidev_bp.before_request
def _auth():
    return auth.enforce_auth()


@slidev_bp.get("/project")
def get_project():
    try:
        content = SLIDES.read_text(encoding="utf-8")
    except OSError:
        content = DEFAULT
    return jsonify({"content": content})


@slidev_bp.put("/project")
def put_project():
    content = str((request.get_json(silent=True) or {}).get("content", ""))
    if not content.strip():
        return jsonify({"error": "Die Präsentation darf nicht leer sein."}), 400
    if len(content.encode("utf-8")) > 2_000_000:
        return jsonify({"error": "Die Präsentation ist zu groß."}), 413
    SLIDES.parent.mkdir(parents=True, exist_ok=True)
    temporary = SLIDES.with_suffix(".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(SLIDES)
    return jsonify({"saved": True})
