"""Short-lived signed tickets and cookies for embedded external workspaces."""

import base64
import binascii
import hashlib
import hmac
import json
import os
import time
from pathlib import Path

from backend.integration_config import INTEGRATIONS_DIR

SECRET_PATH = INTEGRATIONS_DIR / ".workspace-embed-secret"
ALLOWED_TARGETS = {"slidev", "hyperframes", "excalidraw"}


def _secret() -> bytes:
    INTEGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
    try:
        return SECRET_PATH.read_bytes()
    except OSError:
        value = os.urandom(32)
        try:
            fd = os.open(SECRET_PATH, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "wb") as handle:
                handle.write(value)
            return value
        except FileExistsError:
            return SECRET_PATH.read_bytes()


def issue(target: str, lifetime: int = 120) -> str:
    if target not in ALLOWED_TARGETS:
        raise ValueError("unknown workspace")
    payload = json.dumps(
        {"target": target, "exp": int(time.time()) + lifetime},
        separators=(",", ":"),
    ).encode()
    encoded = base64.urlsafe_b64encode(payload).rstrip(b"=")
    signature = hmac.new(_secret(), encoded, hashlib.sha256).digest()
    return f"{encoded.decode()}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


def verify(token: str, target: str) -> bool:
    try:
        encoded, supplied = token.split(".", 1)
        signature = base64.urlsafe_b64decode(supplied + "=" * (-len(supplied) % 4))
        expected = hmac.new(_secret(), encoded.encode(), hashlib.sha256).digest()
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        return (
            hmac.compare_digest(signature, expected)
            and payload.get("target") == target
            and int(payload.get("exp", 0)) >= int(time.time())
        )
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, binascii.Error):
        return False
