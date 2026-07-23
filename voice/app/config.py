"""Centralised configuration management.

All configurable values are externalised into environment variables (loaded
from a local ``.env`` file). No secrets are hardcoded anywhere in the code
base. Import :data:`config` to access typed, validated settings.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Load variables from a local .env file if present. Real environment
# variables (e.g. from docker-compose) always take precedence over the file.
load_dotenv()
# Telephony settings managed via the OrganAIzer "Telefonie" page live in a
# protected env file inside the shared, persisted data/ directory. It fills in
# any value not already provided by the process environment (so container infra
# overrides such as LIVEKIT_URL/SERVER_HOST still win).
_TELEPHONY_ENV = Path(__file__).resolve().parent.parent / "data" / "telephony.env"
if _TELEPHONY_ENV.exists():
    load_dotenv(_TELEPHONY_ENV)


def _get(name: str, default: str | None = None, *, required: bool = False) -> str:
    value = os.getenv(name, default)
    if required and not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            f"Copy .env.example to .env and fill it in."
        )
    return value or ""


@dataclass(frozen=True)
class OpenAIConfig:
    api_key: str
    model: str
    voice: str
    # Model used for the web-research tool (Responses API + hosted web_search).
    search_model: str


@dataclass(frozen=True)
class LiveKitConfig:
    url: str
    api_key: str
    api_secret: str
    # Public URL handed to browser clients (may differ from the internal `url`
    # the agent uses, e.g. when running behind Docker / on a remote server).
    public_url: str


@dataclass(frozen=True)
class ServerConfig:
    host: str
    port: int
    web_room_name: str


@dataclass(frozen=True)
class AssistantConfig:
    name: str
    company: str
    greeting: str
    languages: str


@dataclass(frozen=True)
class TwilioConfig:
    """Twilio Elastic SIP Trunk details (inbound + outbound telephony)."""

    account_sid: str
    auth_token: str
    trunk_sid: str
    sip_uri: str
    # LiveKit outbound SIP trunk id, created on demand for outbound calls.
    outbound_trunk_id: str


@dataclass(frozen=True)
class Config:
    openai: OpenAIConfig
    livekit: LiveKitConfig
    server: ServerConfig
    assistant: AssistantConfig
    twilio: TwilioConfig
    phone_number: str
    # Persistent phonebook (runtime file + seed used to create it on first run).
    phonebook_path: str
    phonebook_seed_path: str
    # Additional domain knowledge injected into the assistant's system prompt.
    knowledge_path: str
    # Knowledge source: 'file' (knowledge_path) or 'obsidian' (aggregate vault).
    knowledge_source: str
    obsidian_root: str
    obsidian_vault: str
    # Host-local Hermes agent with access to calendar, email and other tools.
    hermes_api_url: str
    hermes_api_key: str
    hermes_model: str
    # Health/metrics HTTP server of the agent worker. Bound to localhost and a
    # dedicated port so it never collides with the other services that share
    # the host network (LiveKit/SIP already use 8081).
    agent_http_host: str
    agent_http_port: int
    log_level: str = field(default="INFO")

    @classmethod
    def load(cls) -> "Config":
        return cls(
            openai=OpenAIConfig(
                api_key=_get("OPENAI_API_KEY", ""),
                model=_get("OPENAI_REALTIME_MODEL", "gpt-realtime"),
                voice=_get("OPENAI_VOICE", "marin"),
                search_model=_get("OPENAI_SEARCH_MODEL", "gpt-4o-mini"),
            ),
            livekit=LiveKitConfig(
                url=_get("LIVEKIT_URL", "ws://localhost:7880"),
                api_key=_get("LIVEKIT_API_KEY", "devkey"),
                api_secret=_get("LIVEKIT_API_SECRET", "secret"),
                public_url=_get(
                    "LIVEKIT_PUBLIC_URL",
                    _get("LIVEKIT_URL", "ws://localhost:7880"),
                ),
            ),
            server=ServerConfig(
                host=_get("SERVER_HOST", "localhost"),
                port=int(_get("SERVER_PORT", "2300")),
                web_room_name=_get("WEB_ROOM_NAME", "organaizer-web"),
            ),
            assistant=AssistantConfig(
                name=_get("ASSISTANT_NAME", "OrganAIzer"),
                company=_get("COMPANY_NAME", "OrganAIzer"),
                greeting=_get(
                    "GREETING",
                    "Hallo, ich bin Ihr persönlicher Organizer. "
                    "Was kann ich heute für Sie tun?",
                ),
                languages=_get("LANGUAGES", "Deutsch (Standard), Englisch"),
            ),
            twilio=TwilioConfig(
                account_sid=_get("TWILIO_ACCOUNT_SID", ""),
                auth_token=_get("TWILIO_AUTH_TOKEN", ""),
                trunk_sid=_get("TWILIO_TRUNK_SID", ""),
                sip_uri=_get("TWILIO_SIP_URI", ""),
                outbound_trunk_id=_get("LIVEKIT_OUTBOUND_TRUNK_ID", ""),
            ),
            phone_number=_get("PHONE_NUMBER", "tbd"),
            phonebook_path=_get("PHONEBOOK_PATH", "data/phonebook.json"),
            phonebook_seed_path=_get("PHONEBOOK_SEED_PATH", "data/phonebook.seed.json"),
            knowledge_path=_get("KNOWLEDGE_PATH", "data/knowledge.md"),
            knowledge_source=_get("KNOWLEDGE_SOURCE", "file"),
            obsidian_root=_get("OBSIDIAN_ROOT", "/app/obsidian"),
            obsidian_vault=_get("OBSIDIAN_VAULT", ""),
            hermes_api_url=_get("HERMES_API_URL", "http://localhost:8642"),
            hermes_api_key=_get(
                "HERMES_API_SERVER_KEY",
                _get("HERMES_API_KEY", ""),
            ),
            hermes_model=_get("HERMES_MODEL", "hermes-agent"),
            agent_http_host=_get("AGENT_HTTP_HOST", "127.0.0.1"),
            agent_http_port=int(_get("AGENT_HTTP_PORT", "8090")),
            log_level=_get("LOG_LEVEL", "INFO"),
        )


# Singleton-style config instance imported across the application.
config = Config.load()
