from unittest.mock import patch

import pytest
import requests

from backend.server import create_app


@pytest.fixture()
def client():
    app = create_app()
    app.config["TESTING"] = True
    with patch("backend.api.excalidraw_routes.auth.enforce_auth", return_value=None):
        with app.test_client() as test_client:
            yield test_client


def test_status_is_a_safe_offline_response(client):
    with patch("backend.api.excalidraw_routes.requests.get", side_effect=requests.RequestException("offline")):
        response = client.get("/api/excalidraw/status")
    assert response.status_code == 200
    assert response.get_json() == {"available": False, "storage": "browser"}
