"""Persistent, secure store for all telephony configuration.

Everything that the telephony / voice stack needs (Twilio, OpenAI Realtime,
LiveKit, assistant identity) is configured on the *Telefonie* page and persisted
here. Values are written to a protected env file (``TELEPHONY_ENV_PATH``) that:

- lives in the git-ignored, upload-excluded ``data/`` directory, so **no secret
  ever enters the repository or a deploy sync**;
- is mounted into the container via the ``data`` volume, so it survives
  restarts/redeploys and is shared with the voice-stack services (which read it
  through ``env_file`` in docker-compose).

Secret fields are **write-only**: they are stored but never returned to the
frontend (only a ``has_*`` boolean is exposed).
"""

from __future__ import annotations

import logging
import os
import tempfile
from dataclasses import dataclass

from backend.config import TELEPHONY_ENV_PATH

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Field:
    """A single telephony setting mapped to a voice-stack env variable."""

    key: str          # frontend/JSON key
    env: str          # environment variable name used by the voice stack
    secret: bool = False
    default: str = ""


# Ordered list of all telephony settings. The ``env`` names match the voice
# stack's own configuration (see voice/app/config.py) so the same file drives
# both the control plane and the agent/web/sip services.
FIELDS: tuple[Field, ...] = (
    # --- General ---
    Field("enabled", "TELEPHONY_ENABLED", default="false"),
    Field("provider", "TELEPHONY_PROVIDER", default="twilio"),
    Field("phone_number", "PHONE_NUMBER", default=""),
    # --- Twilio (Elastic SIP Trunk) ---
    Field("twilio_account_sid", "TWILIO_ACCOUNT_SID"),
    Field("twilio_auth_token", "TWILIO_AUTH_TOKEN", secret=True),
    Field("twilio_sip_uri", "TWILIO_SIP_URI"),
    Field("twilio_trunk_sid", "TWILIO_TRUNK_SID"),
    # LiveKit outbound SIP trunk id (created for outbound dialing).
    Field("outbound_trunk_id", "LIVEKIT_OUTBOUND_TRUNK_ID"),
    # --- OpenAI Realtime / research ---
    Field("openai_api_key", "OPENAI_API_KEY", secret=True),
    Field("openai_realtime_model", "OPENAI_REALTIME_MODEL", default="gpt-realtime"),
    Field("openai_voice", "OPENAI_VOICE", default="marin"),
    Field("openai_search_model", "OPENAI_SEARCH_MODEL", default="gpt-4o-mini"),
    # --- LiveKit ---
    Field("livekit_url", "LIVEKIT_URL", default="ws://localhost:7880"),
    Field("livekit_public_url", "LIVEKIT_PUBLIC_URL", default=""),
    Field("livekit_api_key", "LIVEKIT_API_KEY", default="devkey"),
    Field("livekit_api_secret", "LIVEKIT_API_SECRET", secret=True, default="secret"),
    Field("web_room_name", "WEB_ROOM_NAME", default="organaizer-web"),
    # --- Assistant identity / behaviour ---
    Field("assistant_name", "ASSISTANT_NAME", default="OrganAIzer"),
    Field("assistant_greeting", "GREETING",
          default="Hallo, ich bin Ihr persönlicher Organizer. "
                  "Was kann ich heute für Sie tun?"),
    Field("assistant_languages", "LANGUAGES", default="Deutsch (Standard), Englisch"),
    # --- Knowledge base ---
    # 'obsidian' -> aggregate the user's Obsidian vault; 'file' -> knowledge.md
    Field("knowledge_source", "KNOWLEDGE_SOURCE", default="file"),
    Field("obsidian_vault", "OBSIDIAN_VAULT", default=""),
)

_BY_KEY = {f.key: f for f in FIELDS}
_BY_ENV = {f.env: f for f in FIELDS}
SECRET_KEYS = {f.key for f in FIELDS if f.secret}


# ── low-level env file IO ──────────────────────────────────────────────────────

def _parse_env_file(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    if not os.path.exists(path):
        return values
    try:
        with open(path, encoding="utf-8") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip()
                # strip optional surrounding quotes
                if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
                    val = val[1:-1]
                values[key] = val
    except OSError:
        logger.exception("Failed to read telephony env file %s", path)
    return values


def _write_env_file(path: str, values: dict[str, str]) -> None:
    """Atomically write ``values`` (env-name -> value) to ``path``."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    lines = [
        "# OrganAIzer telephony configuration (managed via the Telefonie page).",
        "# Contains secrets - never commit, never upload. Mounted into the voice",
        "# stack via docker-compose env_file.",
        "",
    ]
    for f in FIELDS:
        val = values.get(f.env, "")
        # Quote values that contain spaces or special characters.
        if val and (" " in val or any(c in val for c in "\"'#")):
            safe = val.replace('"', '\\"')
            lines.append(f'{f.env}="{safe}"')
        else:
            lines.append(f"{f.env}={val}")
    content = "\n".join(lines) + "\n"

    dir_name = os.path.dirname(os.path.abspath(path))
    fd, tmp = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        os.chmod(tmp, 0o600)  # restrict access – contains secrets
        os.replace(tmp, path)
    except OSError:
        logger.exception("Failed to write telephony env file %s", path)
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


# ── public API ─────────────────────────────────────────────────────────────────

def _current_env() -> dict[str, str]:
    """Merge process environment (defaults) with the persisted overrides."""
    merged: dict[str, str] = {}
    for f in FIELDS:
        merged[f.env] = os.environ.get(f.env, f.default)
    merged.update(_parse_env_file(TELEPHONY_ENV_PATH))
    return merged


def get_value(key: str) -> str:
    """Return the effective value for a single field key (incl. secrets)."""
    f = _BY_KEY.get(key)
    if not f:
        return ""
    return _current_env().get(f.env, f.default)


def public_config() -> dict:
    """Return the config for the frontend: non-secret values + has_* flags."""
    env = _current_env()
    out: dict[str, object] = {}
    for f in FIELDS:
        if f.secret:
            out[f"has_{f.key}"] = bool(env.get(f.env, "").strip())
        else:
            out[f.key] = env.get(f.env, f.default)
    out["config_path_configured"] = os.path.exists(TELEPHONY_ENV_PATH)
    return out


def save_config(payload: dict) -> dict:
    """Persist a partial config update. Empty secret values are ignored.

    Returns the new public config.
    """
    env = _current_env()
    for key, value in payload.items():
        f = _BY_KEY.get(key)
        if not f:
            continue  # ignore unknown keys (e.g. has_* flags echoed back)
        if f.secret:
            # Only overwrite a secret when a non-empty new value is provided,
            # so re-saving the form does not wipe existing secrets.
            if value is None or str(value).strip() == "":
                continue
            env[f.env] = str(value).strip()
        else:
            env[f.env] = "" if value is None else str(value).strip()
    _write_env_file(TELEPHONY_ENV_PATH, env)
    logger.info("Telephony configuration updated (%d fields touched).", len(payload))
    return public_config()
