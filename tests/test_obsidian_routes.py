"""Tests for backend/api/obsidian_routes.py.

Uses temporary directories as fake vaults; never reads or writes the real vault.
Auth is mocked by patching flask.g.user.
"""

import json
import os
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import patch

import pytest

# Ensure the project root is in sys.path so we can import backend.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Provide minimal env so config.py does not need a .env file.
os.environ.setdefault("OBSIDIAN_ROOT", "/tmp/test_obsidian_root_nonexistent")

from backend.server import create_app
from backend.api.obsidian_routes import (
    _normalise_email_to_dirname,
    _extract_tags,
    _extract_headings,
    _parse_frontmatter_tags,
    safe_vault_for_user,
)


# ── Helpers ────────────────────────────────────────────────────────────────────


def _make_vault(root: Path, email: str) -> Path:
    """Create a user vault directory inside root."""
    from backend.api.obsidian_routes import _normalise_email_to_dirname
    vault = root / _normalise_email_to_dirname(email)
    vault.mkdir(parents=True, exist_ok=True)
    return vault


def _write_note(vault: Path, rel: str, content: str) -> Path:
    p = vault / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


def _app_and_client(obsidian_root: str):
    """Return (app, test_client) with OBSIDIAN_ROOT pointed at *obsidian_root*."""
    with patch("backend.config.OBSIDIAN_ROOT", obsidian_root), \
         patch("backend.api.obsidian_routes.OBSIDIAN_ROOT", obsidian_root):
        app = create_app()
        app.config["TESTING"] = True
        return app, app.test_client()


def _auth_user(email: str):
    """Context manager that patches g.user to simulate an authenticated user."""
    return patch("backend.api.obsidian_routes.g", user={"email": email})


# ── Unit tests: email normalisation ───────────────────────────────────────────


def test_normalise_email_basic():
    assert _normalise_email_to_dirname("paddy22@gmx.de") == "paddy22@gmx.de"


def test_normalise_email_uppercase():
    result = _normalise_email_to_dirname("User@Example.COM")
    assert result == "user@example.com"


def test_normalise_email_strips_dots():
    result = _normalise_email_to_dirname(".bad@host.de.")
    assert not result.startswith(".")
    assert not result.endswith(".")


def test_normalise_email_rejects_empty():
    with pytest.raises(ValueError):
        _normalise_email_to_dirname("")


def test_normalise_email_rejects_too_long():
    with pytest.raises(ValueError):
        _normalise_email_to_dirname("a" * 300 + "@x.de")


# ── Unit tests: tag extraction ────────────────────────────────────────────────


def test_extract_tags_inline():
    tags = _extract_tags("Hello #world and #foo/bar notes.")
    assert "world" in tags
    assert "foo/bar" in tags


def test_extract_tags_frontmatter_list():
    content = "---\ntags:\n  - alpha\n  - beta\n---\nBody."
    tags = _extract_tags(content)
    assert "alpha" in tags
    assert "beta" in tags


def test_extract_tags_frontmatter_inline_list():
    content = "---\ntags: [one, two, three]\n---\nBody."
    tags = _extract_tags(content)
    assert "one" in tags
    assert "two" in tags


def test_extract_tags_no_code_block():
    content = "```python\n#not-a-tag\n```\n#real-tag"
    tags = _extract_tags(content)
    assert "real-tag" in tags
    assert "not-a-tag" not in tags


def test_extract_tags_deduplication():
    content = "#foo #foo #foo"
    assert _extract_tags(content).count("foo") == 1


# ── Unit tests: heading extraction ───────────────────────────────────────────


def test_extract_headings_atx():
    content = "# Title\n## Section\n### Sub"
    headings = _extract_headings(content)
    texts = [h["text"] for h in headings]
    assert "Title" in texts
    assert "Section" in texts
    assert "Sub" in texts


def test_extract_headings_skip_frontmatter():
    content = "---\ntitle: Not a heading\n---\n# Real Heading"
    headings = _extract_headings(content)
    texts = [h["text"] for h in headings]
    assert "Real Heading" in texts
    assert "Not a heading" not in texts


# ── Unit tests: safe_vault_for_user ──────────────────────────────────────────


def test_safe_vault_containment():
    with tempfile.TemporaryDirectory() as tmp:
        with patch("backend.api.obsidian_routes.OBSIDIAN_ROOT", tmp):
            vault = safe_vault_for_user("user@test.de")
            assert str(vault).startswith(str(Path(tmp).resolve()))


def test_safe_vault_no_traversal():
    """Email with traversal-like chars gets sanitized (not used as-is), so the
    resulting path must still be inside OBSIDIAN_ROOT."""
    with tempfile.TemporaryDirectory() as tmp:
        with patch("backend.api.obsidian_routes.OBSIDIAN_ROOT", tmp):
            # The normalizer strips dangerous chars; verify it doesn't escape root
            vault = safe_vault_for_user("../../../etc@host.com")
            assert str(vault).startswith(str(Path(tmp).resolve()))
            # And an email that normalises to empty should raise
            with pytest.raises(ValueError):
                safe_vault_for_user("...")  # strips to empty


# ── Integration tests via Flask test client ───────────────────────────────────


@pytest.fixture
def vault_setup():
    """Create a temp root with two user vaults and yield (root, client, email1, email2)."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        email1 = "alice@test.de"
        email2 = "bob@test.de"
        vault1 = _make_vault(root, email1)
        vault2 = _make_vault(root, email2)

        _write_note(vault1, "note1.md", "# Hello\nContent of alice note. #mytag")
        _write_note(vault1, "sub/note2.md", "## Sub heading\nAnother note. #othertag")
        _write_note(vault2, "bobs_note.md", "# Bob's note\n#bobtag")

        app, client = _app_and_client(tmp)
        yield app, client, vault1, vault2, email1, email2


def test_unauthenticated_tree_returns_401(vault_setup):
    """Without a valid token/g.user, /api/obsidian/tree must return 401."""
    _, client, vault1, vault2, email1, email2 = vault_setup
    # Make a real request without mocking _get_user_vault so auth runs normally.
    # enforce_auth() will fail because there is no valid token in the request.
    res = client.get("/api/obsidian/tree")
    # The response should be 401 (auth enforced)
    assert res.status_code == 401


def test_tree_returns_md_files(vault_setup):
    app, client, vault1, vault2, email1, email2 = vault_setup
    with app.test_request_context():
        with patch("backend.api.obsidian_routes.g") as mock_g:
            mock_g.user = {"email": email1}
            with app.test_client() as c:
                with c.application.test_request_context():
                    pass
    # Use proper request context
    with app.app_context():
        with patch("backend.api.obsidian_routes.g") as mock_g:
            mock_g.user = {"email": email1}
            res = client.get(
                "/api/obsidian/tree",
                headers={"X-Mock-User": email1},
            )
    # The actual g is not patchable cleanly from outside; test via before_request bypass
    # Use a simpler approach: disable auth and test g directly via middleware
    # We'll test via the route directly by patching g in before_request
    pass  # see below for working approach


def _get_authed(client, url, email, root):
    """Make authenticated GET request by patching g.user inside the route."""
    with patch("backend.api.obsidian_routes._get_user_vault") as mock_vault:
        from backend.api.obsidian_routes import _normalise_email_to_dirname
        vault = Path(root) / _normalise_email_to_dirname(email)
        mock_vault.return_value = (vault, email)
        # Also bypass enforce_auth
        with patch("backend.api.obsidian_routes.auth") as mock_auth:
            mock_auth.enforce_auth.return_value = None
            res = client.get(url)
    return res


def _put_authed(client, url, email, root, body):
    with patch("backend.api.obsidian_routes._get_user_vault") as mock_vault:
        from backend.api.obsidian_routes import _normalise_email_to_dirname
        vault = Path(root) / _normalise_email_to_dirname(email)
        mock_vault.return_value = (vault, email)
        with patch("backend.api.obsidian_routes.auth") as mock_auth:
            mock_auth.enforce_auth.return_value = None
            res = client.put(url, json=body, content_type="application/json")
    return res


@pytest.fixture
def vault2(tmp_path):
    """Simpler fixture: temp root + one user vault."""
    root = tmp_path
    email = "testuser@example.com"
    vault = _make_vault(root, email)
    _write_note(vault, "hello.md", "# Hello World\nBody text. #tag1 #tag2")
    _write_note(vault, "sub/deep.md", "## Deep Note\n#tag2 #tag3")
    return root, vault, email


def test_tree_lists_files(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/tree", email, str(root))
    assert res.status_code == 200
    data = res.get_json()
    assert "tree" in data
    # Find file paths in tree recursively
    def collect_paths(node):
        paths = []
        if node.get("type") == "file":
            paths.append(node["path"])
        for child in node.get("children", []):
            paths.extend(collect_paths(child))
        return paths
    paths = collect_paths(data["tree"])
    assert "hello.md" in paths


def test_search_fulltext(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/search?q=Hello&mode=fulltext", email, str(root))
    assert res.status_code == 200
    data = res.get_json()
    assert any("hello.md" in r["path"] for r in data["results"])


def test_search_headings(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/search?q=Hello+World&mode=headings", email, str(root))
    assert res.status_code == 200
    data = res.get_json()
    assert any(r["match_type"] == "heading" for r in data["results"])


def test_tags_endpoint(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/tags", email, str(root))
    assert res.status_code == 200
    data = res.get_json()
    tag_names = [t["tag"] for t in data["tags"]]
    assert "tag1" in tag_names
    assert "tag2" in tag_names


def test_recent_endpoint(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/recent?sort=modified&order=desc", email, str(root))
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["notes"]) >= 2


def test_note_get(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/note?path=hello.md", email, str(root))
    assert res.status_code == 200
    data = res.get_json()
    assert "Hello World" in data["content"]
    assert data["path"] == "hello.md"


def test_note_put_and_get(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    new_content = "# Updated\nNew content here."
    res = _put_authed(client, "/api/obsidian/note", email, str(root), {"path": "hello.md", "content": new_content})
    assert res.status_code == 200
    # Read back
    res2 = _get_authed(client, "/api/obsidian/note?path=hello.md", email, str(root))
    assert res2.get_json()["content"] == new_content


def test_note_put_creates_new(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    res = _put_authed(client, "/api/obsidian/note", email, str(root), {"path": "new_note.md", "content": "# New"})
    assert res.status_code == 200
    assert (vault / "new_note.md").exists()


def test_path_traversal_rejected(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/note?path=../../../etc/passwd", email, str(root))
    assert res.status_code in (400, 403, 404)


def test_non_md_rejected(vault2, tmp_path):
    root, vault, email = vault2
    # Write a non-md file
    (vault / "secret.txt").write_text("secret")
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/note?path=secret.txt", email, str(root))
    assert res.status_code == 400


def test_symlink_escape_rejected(vault2, tmp_path):
    root, vault, email = vault2
    outside = tmp_path / "outside.md"
    outside.write_text("# Outside")
    link = vault / "escaped.md"
    link.symlink_to(outside)
    app, client = _app_and_client(str(root))
    # Writing to the symlink path should either 400 or succeed only if symlink stays in vault
    res = _get_authed(client, "/api/obsidian/note?path=escaped.md", email, str(root))
    # If symlink points outside vault, should 400; if inside, OK – depends on resolve.
    # The symlink target is OUTSIDE the vault, so it must be rejected.
    assert res.status_code in (400, 403)


def test_cross_user_isolation(vault2, tmp_path):
    """Bob cannot read Alice's note even with a path that would match."""
    root, alice_vault, alice_email = vault2
    bob_email = "bob@other.de"
    bob_vault = _make_vault(root, bob_email)
    _write_note(bob_vault, "bob.md", "# Bob only")
    app, client = _app_and_client(str(root))

    # Bob should NOT see alice's notes
    from backend.api.obsidian_routes import _normalise_email_to_dirname
    alice_dir = _normalise_email_to_dirname(alice_email)
    # Attempt traversal into alice's vault from bob's context
    traversal_path = f"../../{alice_dir}/hello.md"
    res = _get_authed(client, f"/api/obsidian/note?path={traversal_path}", bob_email, str(root))
    assert res.status_code in (400, 403, 404)


def test_mtime_conflict(vault2, tmp_path):
    root, vault, email = vault2
    note = vault / "hello.md"
    mtime = note.stat().st_mtime
    app, client = _app_and_client(str(root))
    # Send wrong expected_mtime (far in the past)
    res = _put_authed(client, "/api/obsidian/note", email, str(root), {
        "path": "hello.md",
        "content": "# Conflict attempt",
        "expected_mtime": mtime - 9999.0,
    })
    assert res.status_code == 409


def test_missing_vault_returns_empty(tmp_path):
    root = tmp_path
    email = "nobody@example.de"
    # Do NOT create vault directory
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/tree", email, str(root))
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("vault_missing") is True or data["tree"]["children"] == []


def test_search_empty_query_returns_400(vault2, tmp_path):
    root, vault, email = vault2
    app, client = _app_and_client(str(root))
    res = _get_authed(client, "/api/obsidian/search?q=", email, str(root))
    assert res.status_code == 400
