from unittest.mock import Mock, patch

import pytest
import requests

from backend.server import create_app


@pytest.fixture()
def client():
    app = create_app()
    app.config["TESTING"] = True
    with patch("backend.api.open_notebook_routes.auth.enforce_auth", return_value=None):
        with app.test_client() as test_client:
            yield test_client


def test_status_is_a_safe_offline_response(client):
    with patch("backend.api.open_notebook_routes.requests.get", side_effect=requests.RequestException("offline")):
        response = client.get("/api/open-notebook/status")
    assert response.status_code == 200
    assert response.get_json()["available"] is False


def test_notebook_name_is_required(client):
    response = client.post("/api/open-notebook/notebooks", json={"name": "  "})
    assert response.status_code == 400


def test_list_notebooks_is_forwarded_server_side(client):
    upstream = Mock()
    upstream.content = b"[]"
    upstream.status_code = 200
    upstream.json.return_value = []
    with patch("backend.api.open_notebook_routes.requests.request", return_value=upstream) as call:
        response = client.get("/api/open-notebook/notebooks")
    assert response.status_code == 200
    assert response.get_json() == []
    assert call.call_args.args[1].endswith("/api/notebooks")


def test_delete_rejects_unknown_resource_ids(client):
    response = client.delete("/api/open-notebook/notebooks/source:123")
    assert response.status_code == 400
