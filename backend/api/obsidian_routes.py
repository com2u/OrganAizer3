"""Obsidian Vault API routes for OrganAIzer.

User isolation: every endpoint resolves the vault path from the authenticated
user's email (g.user["email"]) and the configured OBSIDIAN_ROOT directory.
No host paths are returned in API responses — only relative vault paths.

Security guarantees
-------------------
- User email comes exclusively from validated g.user (OpenWebUI token).
- safe_vault_for_user() normalises the email to a safe directory name and
  verifies the resulting path stays within OBSIDIAN_ROOT.
- Every path parameter is verified with Path.resolve() / relative_to().
- Symlinks that escape the user vault are rejected.
- Only .md files may be read or written.
- Atomic write via temp file + os.replace (same directory).
- Maximum file size: 5 MB read, 2 MB write.
- API responses never include host-absolute paths.
- Missing vault returns empty-state / 404, never falls back to another user.
"""

import logging
import os
import re
import tempfile
import time
from pathlib import Path

from flask import Blueprint, g, jsonify, request

from backend import auth
from backend.config import OBSIDIAN_ROOT

logger = logging.getLogger(__name__)

obsidian_bp = Blueprint("obsidian", __name__)


@obsidian_bp.before_request
def _enforce_auth():
    """Protect all /api/obsidian/* routes with OpenWebUI-based auth."""
    return auth.enforce_auth()

# ── limits ────────────────────────────────────────────────────────────────────
_MAX_READ_BYTES = 5 * 1024 * 1024    # 5 MB
_MAX_WRITE_BYTES = 2 * 1024 * 1024   # 2 MB
_MAX_SEARCH_RESULTS = 200
_DEFAULT_LIMIT = 50
_SNIPPET_CHARS = 200

# ── email normalisation ────────────────────────────────────────────────────────
_EMAIL_SAFE_RE = re.compile(r"[^\w@.\-+]")


def _normalise_email_to_dirname(email: str) -> str:
    """Return a safe directory name derived from the user's email.

    Rules:
    - lower-case
    - only keep: word chars, @, ., -, +
    - collapse consecutive dots (cannot start/end with dot)
    - result must be non-empty and not start with '.'
    Raises ValueError for emails that cannot be normalised safely.
    """
    if not email or len(email) > 254:
        raise ValueError("Invalid email")
    normalised = _EMAIL_SAFE_RE.sub("_", email.lower())
    # collapse leading/trailing dots that would confuse filesystems
    normalised = normalised.strip(".")
    if not normalised:
        raise ValueError("Email normalises to empty string")
    return normalised


def safe_vault_for_user(user_email: str) -> Path:
    """Return the resolved vault Path for *user_email* inside OBSIDIAN_ROOT.

    Raises ValueError if containment cannot be verified.
    """
    root = Path(OBSIDIAN_ROOT).resolve()
    dir_name = _normalise_email_to_dirname(user_email)
    vault = (root / dir_name).resolve()
    # Containment check
    try:
        vault.relative_to(root)
    except ValueError:
        raise ValueError(f"Vault path escapes OBSIDIAN_ROOT: {vault}")
    return vault


def _safe_note_path(vault: Path, rel_path: str) -> Path:
    """Resolve *rel_path* within *vault* and verify containment + .md extension.

    Returns the resolved absolute Path.
    Raises ValueError on any violation.
    """
    if not rel_path:
        raise ValueError("Empty path")
    if len(rel_path) > 1024:
        raise ValueError("Path too long")
    # Strip leading slashes/dots to make it strictly relative
    clean = rel_path.lstrip("/").lstrip("\\")
    candidate = (vault / clean).resolve()
    # Containment
    try:
        candidate.relative_to(vault.resolve())
    except ValueError:
        raise ValueError("Path escapes vault")
    # Symlink escape check
    try:
        real = candidate.resolve(strict=False)
        real.relative_to(vault.resolve())
    except ValueError:
        raise ValueError("Symlink escapes vault")
    # Only .md files
    if candidate.suffix.lower() != ".md":
        raise ValueError("Only .md files are allowed")
    return candidate


# ── tag extraction ─────────────────────────────────────────────────────────────

_INLINE_TAG_RE = re.compile(r"(?<![`\w])#([\w/\-]+)")

# Patterns to extract YAML frontmatter tag lists without PyYAML dependency.
# Matches the tags/tag key line (with optional inline value)
_FM_TAG_KEY_RE = re.compile(
    r"^(?:tags|tag)[ \t]*:[ \t]*(.*?)$", re.MULTILINE | re.IGNORECASE
)
_FM_TAG_LIST_ITEM_RE = re.compile(r"^\s+-\s+(.+)$", re.MULTILINE)


def _parse_frontmatter_tags(fm_text: str) -> list[str]:
    """Extract tags from YAML frontmatter text without a YAML library.

    Supports:
    - tags: [a, b, c]
    - tags: a, b, c
    - tags:\\n  - a\\n  - b
    """
    tags: list[str] = []
    m = _FM_TAG_KEY_RE.search(fm_text)
    if not m:
        return tags
    value = m.group(1).strip()
    # Inline list: [a, b, c]
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1]
        for part in inner.split(","):
            t = part.strip().strip('"').strip("'")
            if t:
                tags.append(t)
    elif value:
        # Single-line comma-separated or single value
        for part in value.replace(",", " ").split():
            t = part.strip().strip('"').strip("'")
            if t:
                tags.append(t)
    else:
        # Multi-line block list (tags:\\n  - item)
        rest = fm_text[m.end():]
        for item_m in _FM_TAG_LIST_ITEM_RE.finditer(rest):
            # Stop at the first line that is not indented (new YAML key)
            preceding_lines = rest[:item_m.start()].splitlines()
            if preceding_lines:
                last_line = preceding_lines[-1]
                if last_line and not last_line[0].isspace():
                    break
            t = item_m.group(1).strip().strip('"').strip("'")
            if t:
                tags.append(t)
    return tags

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _extract_tags(content: str) -> list[str]:
    """Extract unique, normalised tags from a Markdown file's content."""
    tags: set[str] = set()

    # YAML frontmatter tags (stdlib-only parser for the tags/tag field):
    fm_match = _FRONTMATTER_RE.match(content)
    if fm_match:
        try:
            fm_text = fm_match.group(1)
            raw_tags = _parse_frontmatter_tags(fm_text)
            for t in raw_tags:
                tags.add(t.strip().lstrip("#").lower())
        except Exception:
            pass

    # Inline #tags (outside frontmatter):
    body_start = fm_match.end() if fm_match else 0
    body = content[body_start:]
    # Remove code blocks to avoid false positives
    body_no_code = re.sub(r"```.*?```", "", body, flags=re.DOTALL)
    body_no_code = re.sub(r"`[^`]+`", "", body_no_code)
    for m in _INLINE_TAG_RE.finditer(body_no_code):
        tags.add(m.group(1).lower())

    return sorted(tags)


# ── heading extraction ─────────────────────────────────────────────────────────

_ATX_HEADING_RE = re.compile(r"^#{1,6}\s+(.+?)(?:\s+#+)?\s*$", re.MULTILINE)
_SETEXT_H1_RE = re.compile(r"^(.+)\n={3,}\s*$", re.MULTILINE)
_SETEXT_H2_RE = re.compile(r"^(.+)\n-{3,}\s*$", re.MULTILINE)


def _extract_headings(content: str) -> list[dict]:
    """Return list of {text, line} for all headings, skipping frontmatter."""
    fm_match = _FRONTMATTER_RE.match(content)
    body_start_line = 0
    if fm_match:
        body_start_line = content[:fm_match.end()].count("\n")
        content = content[fm_match.end():]

    headings = []
    lines = content.splitlines()
    for i, line in enumerate(lines):
        m = _ATX_HEADING_RE.match(line)
        if m:
            headings.append({"text": m.group(1).strip(), "line": i + 1 + body_start_line})
    # Setext headings
    for m in _SETEXT_H1_RE.finditer(content):
        text = m.group(1).strip()
        line = content[: m.start()].count("\n") + 1 + body_start_line
        headings.append({"text": text, "line": line})
    for m in _SETEXT_H2_RE.finditer(content):
        text = m.group(1).strip()
        line = content[: m.start()].count("\n") + 1 + body_start_line
        headings.append({"text": text, "line": line})
    return sorted(headings, key=lambda h: h["line"])


# ── filesystem helpers ─────────────────────────────────────────────────────────

def _stat_timestamps(path: Path) -> tuple[float, float]:
    """Return (mtime, created_time) for *path*.

    created_time falls back to mtime if st_birthtime is unavailable.
    """
    st = path.stat()
    mtime = st.st_mtime
    created = getattr(st, "st_birthtime", None) or mtime
    return mtime, created


def _rel(vault: Path, abs_path: Path) -> str:
    return abs_path.relative_to(vault).as_posix()


def _build_tree(vault: Path) -> dict:
    """Recursively build a tree of folders and .md files."""
    if not vault.exists():
        return {"type": "directory", "name": "", "children": []}

    def _walk(p: Path) -> dict | None:
        if p.is_symlink():
            # Only allow symlinks that stay within the vault
            try:
                p.resolve().relative_to(vault.resolve())
            except ValueError:
                logger.warning("Symlink outside vault, skipping: %s", p)
                return None
        if p.is_dir():
            children = []
            try:
                entries = sorted(p.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
            except PermissionError:
                return None
            for child in entries:
                node = _walk(child)
                if node is not None:
                    children.append(node)
            return {"type": "directory", "name": p.name, "path": _rel(vault, p), "children": children}
        elif p.is_file() and p.suffix.lower() == ".md":
            mtime, created = _stat_timestamps(p)
            return {
                "type": "file",
                "name": p.name,
                "path": _rel(vault, p),
                "mtime": mtime,
                "created": created,
                "size": p.stat().st_size,
            }
        return None

    children = []
    try:
        entries = sorted(vault.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
    except PermissionError:
        return {"type": "directory", "name": "", "children": []}
    for child in entries:
        node = _walk(child)
        if node is not None:
            children.append(node)
    return {"type": "directory", "name": "", "path": "", "children": children}


def _read_note_safe(path: Path) -> str | None:
    """Read a note, enforcing size limit. Returns None if too large."""
    size = path.stat().st_size
    if size > _MAX_READ_BYTES:
        return None
    return path.read_text(encoding="utf-8", errors="replace")


def _get_user_vault() -> tuple[Path, str] | tuple[None, None]:
    """Return (vault_path, email) for the current authenticated user.

    Returns (None, None) if user is not authenticated or email is missing.
    """
    user = getattr(g, "user", None)
    if not user or not isinstance(user, dict):
        return None, None
    email = user.get("email", "")
    if not email:
        return None, None
    try:
        vault = safe_vault_for_user(email)
    except ValueError as exc:
        logger.warning("Cannot build vault path: %s", exc)
        return None, None
    return vault, email


# ── routes ────────────────────────────────────────────────────────────────────

@obsidian_bp.route("/tree", methods=["GET"])
def get_tree():
    """Return the directory tree of .md files in the user vault."""
    vault, _ = _get_user_vault()
    if vault is None:
        return jsonify({"error": "Not authenticated"}), 401
    if not vault.exists():
        return jsonify({"tree": {"type": "directory", "name": "", "children": []}, "vault_missing": True})
    return jsonify({"tree": _build_tree(vault)})


@obsidian_bp.route("/search", methods=["GET"])
def search():
    """Search the vault.

    Query params:
        q       – required search term
        mode    – 'fulltext' (default) or 'headings'
        limit   – max results (default 50, max 200)
    """
    vault, _ = _get_user_vault()
    if vault is None:
        return jsonify({"error": "Not authenticated"}), 401

    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"error": "q parameter required"}), 400
    if len(q) > 500:
        return jsonify({"error": "Query too long"}), 400

    mode = request.args.get("mode", "fulltext")
    if mode not in ("fulltext", "headings"):
        mode = "fulltext"

    try:
        limit = min(int(request.args.get("limit", _DEFAULT_LIMIT)), _MAX_SEARCH_RESULTS)
    except (ValueError, TypeError):
        limit = _DEFAULT_LIMIT

    if not vault.exists():
        return jsonify({"results": [], "total": 0})

    q_lower = q.lower()
    results = []

    for md_file in vault.rglob("*.md"):
        if md_file.is_symlink():
            try:
                md_file.resolve().relative_to(vault.resolve())
            except ValueError:
                continue
        if not md_file.is_file():
            continue

        content = _read_note_safe(md_file)
        if content is None:
            continue

        rel = _rel(vault, md_file)
        mtime, created = _stat_timestamps(md_file)
        tags = _extract_tags(content)

        if mode == "headings":
            headings = _extract_headings(content)
            for h in headings:
                if q_lower in h["text"].lower():
                    results.append({
                        "path": rel,
                        "title": h["text"],
                        "snippet": h["text"][:_SNIPPET_CHARS],
                        "line": h["line"],
                        "tags": tags,
                        "mtime": mtime,
                        "created": created,
                        "match_type": "heading",
                    })
        else:
            # fulltext
            lines = content.splitlines()
            matched_lines = []
            for lineno, line in enumerate(lines, 1):
                if q_lower in line.lower():
                    matched_lines.append((lineno, line))

            if matched_lines:
                # Title: first ATX heading or filename
                title = md_file.stem
                fm_match = _FRONTMATTER_RE.match(content)
                body = content[fm_match.end():] if fm_match else content
                atx = _ATX_HEADING_RE.search(body)
                if atx:
                    title = atx.group(1).strip()

                # Best snippet: first match
                best_line, best_text = matched_lines[0]
                snippet = best_text.strip()[:_SNIPPET_CHARS]

                results.append({
                    "path": rel,
                    "title": title,
                    "snippet": snippet,
                    "line": best_line,
                    "match_count": len(matched_lines),
                    "tags": tags,
                    "mtime": mtime,
                    "created": created,
                    "match_type": "fulltext",
                })

        if len(results) >= limit:
            break

    return jsonify({"results": results[:limit], "total": len(results)})


@obsidian_bp.route("/tags", methods=["GET"])
def get_tags():
    """Return all tags extracted from the vault with per-tag file counts.

    Query params:
        q – optional case-insensitive filter on tag name
    """
    vault, _ = _get_user_vault()
    if vault is None:
        return jsonify({"error": "Not authenticated"}), 401
    if not vault.exists():
        return jsonify({"tags": []})

    q = (request.args.get("q") or "").strip().lower()

    tag_map: dict[str, list[str]] = {}  # tag -> [rel_path, ...]

    for md_file in vault.rglob("*.md"):
        if md_file.is_symlink():
            try:
                md_file.resolve().relative_to(vault.resolve())
            except ValueError:
                continue
        if not md_file.is_file():
            continue
        content = _read_note_safe(md_file)
        if content is None:
            continue
        rel = _rel(vault, md_file)
        for tag in _extract_tags(content):
            tag_map.setdefault(tag, []).append(rel)

    result = []
    for tag, files in sorted(tag_map.items()):
        if q and q not in tag:
            continue
        result.append({"tag": tag, "count": len(files), "files": files})

    return jsonify({"tags": result})


@obsidian_bp.route("/recent", methods=["GET"])
def get_recent():
    """Return notes sorted by modification or creation time.

    Query params:
        sort  – 'modified' (default) or 'created'
        order – 'desc' (default) or 'asc'
        limit – max results (default 50, max 200)
    """
    vault, _ = _get_user_vault()
    if vault is None:
        return jsonify({"error": "Not authenticated"}), 401
    if not vault.exists():
        return jsonify({"notes": []})

    sort_by = request.args.get("sort", "modified")
    if sort_by not in ("modified", "created"):
        sort_by = "modified"
    order = request.args.get("order", "desc")
    if order not in ("asc", "desc"):
        order = "desc"
    try:
        limit = min(int(request.args.get("limit", _DEFAULT_LIMIT)), _MAX_SEARCH_RESULTS)
    except (ValueError, TypeError):
        limit = _DEFAULT_LIMIT

    notes = []
    for md_file in vault.rglob("*.md"):
        if md_file.is_symlink():
            try:
                md_file.resolve().relative_to(vault.resolve())
            except ValueError:
                continue
        if not md_file.is_file():
            continue
        mtime, created = _stat_timestamps(md_file)
        notes.append({
            "path": _rel(vault, md_file),
            "name": md_file.stem,
            "mtime": mtime,
            "created": created,
            "size": md_file.stat().st_size,
        })

    reverse = order == "desc"
    key = "mtime" if sort_by == "modified" else "created"
    notes.sort(key=lambda n: n[key], reverse=reverse)

    return jsonify({"notes": notes[:limit]})


@obsidian_bp.route("/note", methods=["GET"])
def get_note():
    """Return the content of a single note.

    Query params:
        path – relative vault path (must end with .md)
    """
    vault, _ = _get_user_vault()
    if vault is None:
        return jsonify({"error": "Not authenticated"}), 401

    rel_path = (request.args.get("path") or "").strip()
    try:
        note_path = _safe_note_path(vault, rel_path)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not note_path.exists():
        return jsonify({"error": "Note not found"}), 404

    content = _read_note_safe(note_path)
    if content is None:
        return jsonify({"error": "File too large (max 5 MB)"}), 413

    mtime, created = _stat_timestamps(note_path)
    return jsonify({
        "path": _rel(vault, note_path),
        "content": content,
        "size": note_path.stat().st_size,
        "mtime": mtime,
        "created": created,
    })


@obsidian_bp.route("/note", methods=["PUT"])
def save_note():
    """Create or update a note.

    Body JSON:
        path            – relative vault path (must end with .md)
        content         – new file content (string)
        expected_mtime  – optional float; if provided and mtime differs, returns 409
    """
    vault, _ = _get_user_vault()
    if vault is None:
        return jsonify({"error": "Not authenticated"}), 401

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON body required"}), 400

    rel_path = (body.get("path") or "").strip()
    try:
        note_path = _safe_note_path(vault, rel_path)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    content = body.get("content")
    if not isinstance(content, str):
        return jsonify({"error": "content must be a string"}), 400
    if len(content.encode("utf-8")) > _MAX_WRITE_BYTES:
        return jsonify({"error": "Content too large (max 2 MB)"}), 413

    # Optimistic concurrency
    expected_mtime = body.get("expected_mtime")
    if expected_mtime is not None and note_path.exists():
        current_mtime = note_path.stat().st_mtime
        try:
            if abs(current_mtime - float(expected_mtime)) > 1.0:
                return jsonify({
                    "error": "Conflict: file was modified by another client",
                    "current_mtime": current_mtime,
                }), 409
        except (TypeError, ValueError):
            pass

    # Ensure parent directory exists (within vault)
    parent = note_path.parent
    try:
        parent.relative_to(vault.resolve())
    except ValueError:
        return jsonify({"error": "Invalid parent directory"}), 400
    parent.mkdir(parents=True, exist_ok=True)

    # Atomic write
    try:
        dir_fd = str(note_path.parent)
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=dir_fd, delete=False, suffix=".tmp"
        ) as tmp:
            tmp.write(content)
            tmp_name = tmp.name
        os.replace(tmp_name, str(note_path))
    except OSError as exc:
        logger.error("Failed to write note %s: %s", rel_path, type(exc).__name__)
        return jsonify({"error": "Failed to write note"}), 500

    mtime, created = _stat_timestamps(note_path)
    return jsonify({
        "path": _rel(vault, note_path),
        "mtime": mtime,
        "created": created,
        "size": note_path.stat().st_size,
    })
