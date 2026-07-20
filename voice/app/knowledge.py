"""Knowledge base loader.

Reads additional domain knowledge and injects it into the assistant's system
prompt, so the knowledge is always available during the conversation without an
extra tool round-trip (which keeps the spoken interaction responsive).

Two sources are supported (``KNOWLEDGE_SOURCE``):

- ``file``     -> a single Markdown file (``KNOWLEDGE_PATH``).
- ``obsidian`` -> aggregate the Markdown notes of an Obsidian vault
                  (``OBSIDIAN_ROOT`` + optional ``OBSIDIAN_VAULT`` sub-path),
                  so the phone/web agent answers directly from the same
                  knowledge base the user maintains in OrganAIzer.
"""

from __future__ import annotations

from pathlib import Path

from .logging_config import get_logger

logger = get_logger("knowledge")

_MAX_CHARS = 12000


def _load_file(path: str) -> str:
    if not path:
        return ""
    file = Path(path)
    if not file.exists():
        logger.warning("No knowledge base at %s; continuing without it.", file)
        return ""
    try:
        text = file.read_text(encoding="utf-8").strip()
        logger.info("Loaded knowledge base from %s (%d chars).", file, len(text))
        return text
    except OSError:
        logger.exception("Failed to read knowledge base %s.", file)
        return ""


def _load_obsidian(root: str, vault: str) -> str:
    base = Path(root)
    target = (base / vault).resolve() if vault else base.resolve()
    try:
        target.relative_to(base.resolve())
    except ValueError:
        logger.warning("OBSIDIAN_VAULT escapes OBSIDIAN_ROOT; ignoring vault sub-path.")
        target = base.resolve()
    if not target.exists():
        logger.warning("Obsidian knowledge path %s not found.", target)
        return ""

    parts: list[str] = []
    total = 0
    for md in sorted(target.rglob("*.md")):
        try:
            text = md.read_text(encoding="utf-8").strip()
        except OSError:
            continue
        if not text:
            continue
        block = f"## {md.stem}\n{text}"
        parts.append(block)
        total += len(block)
        if total >= _MAX_CHARS:
            break
    if parts:
        logger.info("Loaded Obsidian knowledge from %s (%d notes).", target, len(parts))
        return "\n\n".join(parts)[:_MAX_CHARS]
    logger.info("Obsidian vault %s empty; no knowledge loaded.", target)
    return ""


def load_knowledge(path: str) -> str:
    """Backwards-compatible file loader (kept for existing callers)."""
    return _load_file(path)


def load_knowledge_from_config(cfg) -> str:
    """Load knowledge according to the configured source."""
    if getattr(cfg, "knowledge_source", "file") == "obsidian":
        text = _load_obsidian(cfg.obsidian_root, cfg.obsidian_vault)
        if text:
            return text
        logger.info("Falling back to knowledge file.")
    return _load_file(cfg.knowledge_path)
