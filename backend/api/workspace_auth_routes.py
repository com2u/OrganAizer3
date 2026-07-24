"""Automatic browser authentication for reverse-proxied iframe workspaces."""

from flask import Blueprint, jsonify, make_response, redirect, request

from backend import auth
from backend.workspace_tokens import ALLOWED_TARGETS, issue, verify

workspace_auth_bp = Blueprint("workspace_auth", __name__)
SAFE_NEXT = {
    "slidev": "/slidev/",
    "hyperframes": "/",
}


@workspace_auth_bp.get("/ticket/<target>")
def ticket(target: str):
    denied = auth.enforce_auth()
    if denied:
        return denied
    if target not in ALLOWED_TARGETS:
        return jsonify({"error": "Unknown workspace"}), 404
    return jsonify({"ticket": issue(target, 120)})


@workspace_auth_bp.get("/login/<target>")
def login(target: str):
    token = request.args.get("ticket", "")
    if target not in ALLOWED_TARGETS or not verify(token, target):
        return "Ungültiger oder abgelaufener Workspace-Zugang.", 401
    destination = SAFE_NEXT[target]
    if target == "slidev" and request.args.get("view") == "presenter":
        destination = "/slidev/presenter/"
    response = make_response(redirect(destination, code=302))
    response.set_cookie(
        f"organaizer_{target}_embed",
        issue(target, 8 * 60 * 60),
        max_age=8 * 60 * 60,
        secure=True,
        httponly=True,
        samesite="None",
        path="/",
    )
    # CHIPS keeps the iframe session working when browsers block ordinary
    # third-party cookies while still partitioning it to organaizer.app.
    response.headers["Set-Cookie"] = response.headers["Set-Cookie"] + "; Partitioned"
    return response


@workspace_auth_bp.get("/check/<target>")
def check(target: str):
    token = request.cookies.get(f"organaizer_{target}_embed", "")
    return ("", 204) if target in ALLOWED_TARGETS and verify(token, target) else ("", 401)
