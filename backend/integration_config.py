"""Persistent local configuration for optional external integrations."""

import json
import os
import tempfile
from pathlib import Path

from backend.config import PROJECT_ROOT

INTEGRATIONS_DIR = Path(os.getenv("INTEGRATIONS_DIR", Path(PROJECT_ROOT) / "data" / "integrations"))
SECRET_FIELDS = {
    "open_notebook": {"encryption_key", "password", "db_password"},
    "n8n": {"api_key"},
}


def read_config(key: str) -> dict:
    path = INTEGRATIONS_DIR / f"{key}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def public_config(key: str) -> dict:
    config = read_config(key)
    for field in SECRET_FIELDS.get(key, set()):
        value = config.pop(field, "")
        config[f"{field}_configured"] = bool(value)
    return config


def write_config(key: str, values: dict) -> dict:
    INTEGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
    current = read_config(key)
    current.update({k: v for k, v in values.items() if v is not None and v != ""})
    fd, tmp = tempfile.mkstemp(prefix=f".{key}-", dir=INTEGRATIONS_DIR)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(current, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.chmod(tmp, 0o600)
        os.replace(tmp, INTEGRATIONS_DIR / f"{key}.json")
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    if key == "open_notebook":
        cfg = read_config(key)
        env = INTEGRATIONS_DIR / "open-notebook.env"
        env.write_text(
            "\n".join([
                f"OPEN_NOTEBOOK_ENCRYPTION_KEY={cfg.get('encryption_key', '')}",
                f"OPEN_NOTEBOOK_PASSWORD={cfg.get('password', '')}",
                f"OPEN_NOTEBOOK_DB_PASSWORD={cfg.get('db_password', '')}",
                "OPEN_NOTEBOOK_DB_USER=root",
                "SURREAL_USER=root",
                f"SURREAL_PASS={cfg.get('db_password', '')}",
                f"SURREAL_PASSWORD={cfg.get('db_password', '')}",
            ]) + "\n",
            encoding="utf-8",
        )
        os.chmod(env, 0o600)
    return public_config(key)


def is_configured(key: str) -> bool:
    cfg = read_config(key)
    if not cfg.get("enabled", False):
        return False
    if key == "open_notebook":
        return all(cfg.get(k) for k in ("public_url", "password", "encryption_key", "db_password"))
    if key == "slidev":
        return bool(cfg.get("public_url"))
    return True
