"""Text assistant for the Telefonie *Sprachassistent* tab.

Provides the same brain as the phone agent, but over text: it answers using the
configured knowledge base and can research the web. Implemented against the
OpenAI Responses API via urllib so the control-plane image stays dependency
light (no openai SDK required here).

Fails gracefully: any error returns a readable message instead of raising, so
the chat UI never dead-ends.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from pathlib import Path

from backend.config import KNOWLEDGE_FILE_PATH, OBSIDIAN_ROOT
from . import config_store

logger = logging.getLogger(__name__)

_OPENAI_URL = "https://api.openai.com/v1/responses"
_TIMEOUT = 40
_MAX_KNOWLEDGE_CHARS = 12000


def _load_knowledge() -> str:
    """Return knowledge text from the configured source (Obsidian or file)."""
    source = config_store.get_value("knowledge_source") or "file"
    if source == "obsidian":
        vault = config_store.get_value("obsidian_vault").strip()
        base = Path(OBSIDIAN_ROOT)
        root = (base / vault).resolve() if vault else base.resolve()
        try:
            root.relative_to(base.resolve())
        except ValueError:
            logger.warning("Configured obsidian_vault escapes OBSIDIAN_ROOT; ignoring.")
            root = base.resolve()
        if root.exists():
            parts: list[str] = []
            total = 0
            for md in sorted(root.rglob("*.md")):
                try:
                    text = md.read_text(encoding="utf-8").strip()
                except OSError:
                    continue
                if not text:
                    continue
                block = f"## {md.stem}\n{text}"
                parts.append(block)
                total += len(block)
                if total >= _MAX_KNOWLEDGE_CHARS:
                    break
            if parts:
                return "\n\n".join(parts)[:_MAX_KNOWLEDGE_CHARS]
        logger.info("Obsidian knowledge source empty/missing; falling back to file.")

    # File fallback
    try:
        if os.path.exists(KNOWLEDGE_FILE_PATH):
            return Path(KNOWLEDGE_FILE_PATH).read_text(encoding="utf-8").strip()
    except OSError:
        logger.exception("Failed to read knowledge file.")
    return ""


def _build_instructions() -> str:
    name = config_store.get_value("assistant_name") or "OrganAIzer"
    knowledge = _load_knowledge()
    kb_block = ""
    if knowledge:
        kb_block = (
            "\n\n# Wissensdatenbank\n"
            "Der folgende Text ist verbindliches Wissen. Passt eine Frage dazu, "
            "beantworte sie auf dieser Basis (ohne zu raten).\n---\n"
            f"{knowledge}\n---"
        )
    return (
        f"Du bist {name}, ein freundlicher, kompetenter Assistent für Telefonie "
        "und Text. Antworte knapp, natürlich und hilfsbereit. Standardsprache ist "
        "Deutsch; wechsle in die Sprache des Nutzers. Wenn du dir bei aktuellen "
        "Fakten unsicher bist, nutze die Websuche und antworte dann in eigenen "
        "Worten. Erfinde niemals Fakten." + kb_block
    )


def ask(message: str) -> dict:
    """Return ``{"reply": str}`` (or ``{"error": str}``) for a user message."""
    api_key = config_store.get_value("openai_api_key").strip()
    if not api_key:
        return {"error": "OpenAI ist nicht konfiguriert. Bitte auf der Telefonie-Seite "
                         "unter Konfiguration einen OpenAI API-Key hinterlegen."}

    model = config_store.get_value("openai_search_model") or "gpt-4o-mini"
    payload = {
        "model": model,
        "instructions": _build_instructions(),
        "input": message,
        "tools": [{"type": "web_search"}],
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        _OPENAI_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = json.loads(exc.read().decode() or "{}").get("error", {}).get("message", "")
        except Exception:  # noqa: BLE001
            pass
        logger.warning("OpenAI request failed (%s): %s", exc.code, detail)
        return {"error": detail or f"OpenAI-Fehler ({exc.code})."}
    except (urllib.error.URLError, OSError) as exc:
        logger.warning("OpenAI unreachable: %s", exc)
        return {"error": "OpenAI ist derzeit nicht erreichbar."}

    reply = _extract_text(data)
    if not reply:
        return {"error": "Keine Antwort erhalten."}
    return {"reply": reply}


def _extract_text(data: dict) -> str:
    """Extract assistant text from a Responses API result."""
    # Convenience field on newer API responses.
    text = (data.get("output_text") or "").strip()
    if text:
        return text
    chunks: list[str] = []
    for item in data.get("output", []) or []:
        if item.get("type") == "message":
            for part in item.get("content", []) or []:
                if part.get("type") in ("output_text", "text"):
                    chunks.append(part.get("text", ""))
    return "".join(chunks).strip()
