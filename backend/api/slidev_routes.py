"""Manage persisted Slidev projects, folders, and media files."""

import os
import re
import shutil
from pathlib import Path

from flask import Blueprint, jsonify, request, send_file

from backend import auth
from backend.integration_config import INTEGRATIONS_DIR

slidev_bp = Blueprint("slidev", __name__)
SLIDEV_ROOT = INTEGRATIONS_DIR.parent / "slidev"
PROJECTS_ROOT = SLIDEV_ROOT / "projects"
ACTIVE_FILE = SLIDEV_ROOT / ".active-project"
LEGACY_SLIDES = SLIDEV_ROOT / "slides.md"
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
NAME_RE = re.compile(r"^[\w .()ÄÖÜäöüß-]{1,100}$", re.UNICODE)
MAX_FILE_SIZE = 100 * 1024 * 1024


@slidev_bp.before_request
def _auth():
    return auth.enforce_auth()


def _safe_name(value: str) -> str:
    value = str(value or "").strip()
    if not NAME_RE.fullmatch(value) or value in {".", ".."}:
        raise ValueError("Ungültiger Name.")
    return value


def _safe_project(value: str) -> Path:
    name = _safe_name(value)
    path = PROJECTS_ROOT / name
    if not path.is_dir():
        raise FileNotFoundError(name)
    return path


def _safe_child(project: Path, relative: str) -> Path:
    relative = str(relative or "").strip().replace("\\", "/").lstrip("/")
    candidate = (project / relative).resolve()
    root = project.resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError("Ungültiger Pfad.")
    return candidate


def _ensure_storage() -> None:
    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)
    default = PROJECTS_ROOT / "OrganAIzer"
    if not any(PROJECTS_ROOT.iterdir()):
        default.mkdir()
        source = LEGACY_SLIDES.read_text(encoding="utf-8") if LEGACY_SLIDES.exists() else DEFAULT
        (default / "slides.md").write_text(source, encoding="utf-8")
        (default / "public").mkdir()
    if not ACTIVE_FILE.exists():
        first = sorted(p.name for p in PROJECTS_ROOT.iterdir() if p.is_dir())[0]
        ACTIVE_FILE.write_text(first, encoding="utf-8")


def _active_name() -> str:
    _ensure_storage()
    value = ACTIVE_FILE.read_text(encoding="utf-8").strip()
    if (PROJECTS_ROOT / value).is_dir():
        return value
    first = sorted(p.name for p in PROJECTS_ROOT.iterdir() if p.is_dir())[0]
    ACTIVE_FILE.write_text(first, encoding="utf-8")
    return first


def _tree(path: Path, root: Path) -> dict:
    children = []
    for child in sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
        rel = child.relative_to(root).as_posix()
        if child.is_dir():
            children.append({"name": child.name, "path": rel, "type": "directory", "children": _tree(child, root)["children"]})
        else:
            children.append({"name": child.name, "path": rel, "type": "file", "size": child.stat().st_size})
    return {"type": "directory", "name": path.name, "path": path.relative_to(root).as_posix() if path != root else "", "children": children}


@slidev_bp.get("/projects")
def list_projects():
    _ensure_storage()
    active = _active_name()
    projects = []
    for path in sorted((p for p in PROJECTS_ROOT.iterdir() if p.is_dir()), key=lambda p: p.name.lower()):
        projects.append({"name": path.name, "active": path.name == active, "tree": _tree(path, path)})
    return jsonify({"active": active, "projects": projects})


@slidev_bp.post("/projects")
def create_project():
    _ensure_storage()
    try:
        name = _safe_name((request.get_json(silent=True) or {}).get("name"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    path = PROJECTS_ROOT / name
    if path.exists():
        return jsonify({"error": "Eine Präsentation mit diesem Namen existiert bereits."}), 409
    path.mkdir()
    (path / "slides.md").write_text(DEFAULT.replace("OrganAIzer Präsentation", name), encoding="utf-8")
    (path / "public").mkdir()
    return jsonify({"name": name}), 201


@slidev_bp.delete("/projects/<path:name>")
def delete_project(name: str):
    _ensure_storage()
    try:
        project = _safe_project(name)
    except (ValueError, FileNotFoundError):
        return jsonify({"error": "Präsentation nicht gefunden."}), 404
    if len([p for p in PROJECTS_ROOT.iterdir() if p.is_dir()]) <= 1:
        return jsonify({"error": "Die letzte Präsentation kann nicht gelöscht werden."}), 409
    if project.name == _active_name():
        return jsonify({"error": "Die aktive Präsentation kann nicht gelöscht werden."}), 409
    shutil.rmtree(project)
    return jsonify({"deleted": True})


@slidev_bp.put("/projects/<path:name>/activate")
def activate_project(name: str):
    try:
        project = _safe_project(name)
    except (ValueError, FileNotFoundError):
        return jsonify({"error": "Präsentation nicht gefunden."}), 404
    temporary = ACTIVE_FILE.with_suffix(".tmp")
    temporary.write_text(project.name, encoding="utf-8")
    os.replace(temporary, ACTIVE_FILE)
    return jsonify({"active": project.name})


@slidev_bp.route("/projects/<path:name>/content", methods=["GET", "PUT"])
def project_content(name: str):
    try:
        project = _safe_project(name)
    except (ValueError, FileNotFoundError):
        return jsonify({"error": "Präsentation nicht gefunden."}), 404
    slides = project / "slides.md"
    if request.method == "GET":
        return jsonify({"content": slides.read_text(encoding="utf-8") if slides.exists() else DEFAULT})
    content = str((request.get_json(silent=True) or {}).get("content", ""))
    if not content.strip():
        return jsonify({"error": "Die Präsentation darf nicht leer sein."}), 400
    if len(content.encode("utf-8")) > 2_000_000:
        return jsonify({"error": "Die Präsentation ist zu groß."}), 413
    temporary = slides.with_suffix(".tmp")
    temporary.write_text(content, encoding="utf-8")
    os.replace(temporary, slides)
    return jsonify({"saved": True})


@slidev_bp.post("/projects/<path:name>/folders")
def create_folder(name: str):
    try:
        project = _safe_project(name)
        data = request.get_json(silent=True) or {}
        parent = _safe_child(project, data.get("parent", ""))
        folder = parent / _safe_name(data.get("name"))
    except (ValueError, FileNotFoundError) as exc:
        return jsonify({"error": str(exc)}), 400
    if not parent.is_dir():
        return jsonify({"error": "Zielordner nicht gefunden."}), 404
    if folder.exists():
        return jsonify({"error": "Der Ordner existiert bereits."}), 409
    folder.mkdir()
    return jsonify({"created": folder.relative_to(project).as_posix()}), 201


@slidev_bp.post("/projects/<path:name>/files")
def upload_file(name: str):
    try:
        project = _safe_project(name)
        parent = _safe_child(project, request.form.get("parent", "public"))
    except (ValueError, FileNotFoundError) as exc:
        return jsonify({"error": str(exc)}), 400
    upload = request.files.get("file")
    if not upload or not upload.filename:
        return jsonify({"error": "Keine Datei ausgewählt."}), 400
    if not parent.is_dir():
        return jsonify({"error": "Zielordner nicht gefunden."}), 404
    try:
        filename = _safe_name(Path(upload.filename).name)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    upload.stream.seek(0, os.SEEK_END)
    size = upload.stream.tell()
    upload.stream.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({"error": "Dateien dürfen maximal 100 MB groß sein."}), 413
    destination = parent / filename
    if destination.exists():
        return jsonify({"error": "Die Datei existiert bereits."}), 409
    upload.save(destination)
    return jsonify({"created": destination.relative_to(project).as_posix()}), 201


@slidev_bp.route("/projects/<path:name>/files/<path:file_path>", methods=["GET", "DELETE"])
def project_file(name: str, file_path: str):
    try:
        project = _safe_project(name)
        target = _safe_child(project, file_path)
    except (ValueError, FileNotFoundError):
        return jsonify({"error": "Datei nicht gefunden."}), 404
    if target == project / "slides.md" or target == project / "public":
        return jsonify({"error": "Die zentrale Präsentationsdatei wird im Editor verwaltet."}), 409
    if request.method == "GET":
        if not target.is_file():
            return jsonify({"error": "Datei nicht gefunden."}), 404
        return send_file(target, as_attachment=request.args.get("download") == "1", conditional=True)
    if not target.exists():
        return jsonify({"error": "Datei nicht gefunden."}), 404
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return jsonify({"deleted": True})


# Compatibility for older frontends during rolling deployments.
@slidev_bp.route("/project", methods=["GET", "PUT"])
def legacy_project():
    name = _active_name()
    return project_content(name)
