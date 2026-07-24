from io import BytesIO
from unittest.mock import patch

import pytest

from backend.api import slidev_routes
from backend.server import create_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    root = tmp_path / "slidev"
    monkeypatch.setattr(slidev_routes, "SLIDEV_ROOT", root)
    monkeypatch.setattr(slidev_routes, "PROJECTS_ROOT", root / "projects")
    monkeypatch.setattr(slidev_routes, "ACTIVE_FILE", root / ".active-project")
    monkeypatch.setattr(slidev_routes, "LEGACY_SLIDES", root / "slides.md")
    app = create_app()
    app.config["TESTING"] = True
    with patch("backend.api.slidev_routes.auth.enforce_auth", return_value=None):
        with app.test_client() as test_client:
            yield test_client


def test_projects_are_created_activated_and_persisted(client):
    initial = client.get("/api/slidev/projects").get_json()
    assert initial["active"] == "OrganAIzer"
    assert client.post("/api/slidev/projects", json={"name": "Kundentermin"}).status_code == 201
    assert client.put("/api/slidev/projects/Kundentermin/activate").get_json()["active"] == "Kundentermin"
    content = "# Kundenpräsentation\n\n![Logo](/logo.png)"
    assert client.put("/api/slidev/projects/Kundentermin/content", json={"content": content}).status_code == 200
    assert client.get("/api/slidev/projects/Kundentermin/content").get_json()["content"] == content


def test_media_upload_tree_download_and_delete(client):
    assert client.post("/api/slidev/projects", json={"name": "Medien"}).status_code == 201
    assert client.post("/api/slidev/projects/Medien/folders", json={"parent": "public", "name": "bilder"}).status_code == 201
    upload = client.post(
        "/api/slidev/projects/Medien/files",
        data={"parent": "public/bilder", "file": (BytesIO(b"fake-image"), "titel.png")},
        content_type="multipart/form-data",
    )
    assert upload.status_code == 201
    projects = client.get("/api/slidev/projects").get_json()["projects"]
    media = next(project for project in projects if project["name"] == "Medien")
    public = next(node for node in media["tree"]["children"] if node["path"] == "public")
    bilder = next(node for node in public["children"] if node["path"] == "public/bilder")
    assert bilder["children"][0]["path"] == "public/bilder/titel.png"
    assert client.get("/api/slidev/projects/Medien/files/public/bilder/titel.png").data == b"fake-image"
    assert client.delete("/api/slidev/projects/Medien/files/public/bilder/titel.png").status_code == 200


def test_path_traversal_and_protected_files_are_rejected(client):
    assert client.delete("/api/slidev/projects/OrganAIzer/files/public").status_code == 409
    assert client.delete("/api/slidev/projects/OrganAIzer/files/../.active-project").status_code in {400, 404}
