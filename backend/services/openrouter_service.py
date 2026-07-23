"""Small OpenRouter client used by planning validation and scheduling."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any

OPENROUTER_API_URL = os.environ.get("OPENROUTER_API_URL", "https://openrouter.ai/api/v1").rstrip("/")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
DEFAULT_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4.1-mini")


class OpenRouterError(RuntimeError):
    pass


def _request(path: str, *, method: str = "GET", body: dict[str, Any] | None = None, timeout: int = 180) -> dict:
    if not OPENROUTER_API_KEY:
        raise OpenRouterError("OPENROUTER_API_KEY ist nicht konfiguriert")
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        f"{OPENROUTER_API_URL}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://organaizer.app",
            "X-Title": "OrganAIzer",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise OpenRouterError(f"OpenRouter HTTP {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise OpenRouterError(f"OpenRouter nicht erreichbar: {type(exc).__name__}") from exc


def list_models() -> list[dict[str, Any]]:
    data = _request("/models").get("data", [])
    models = []
    for model in data:
        architecture = model.get("architecture") or {}
        if "text" not in architecture.get("output_modalities", ["text"]):
            continue
        models.append({
            "id": model.get("id"),
            "name": model.get("name") or model.get("id"),
            "description": model.get("description") or "",
            "context_length": model.get("context_length"),
            "pricing": model.get("pricing") or {},
        })
    return sorted(models, key=lambda item: (item["name"] or "").lower())


def chat_json(model: str, system_prompt: str, user_prompt: str, *, timeout: int = 300) -> dict[str, Any]:
    response = _request(
        "/chat/completions",
        method="POST",
        timeout=timeout,
        body={
            "model": model or DEFAULT_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        },
    )
    try:
        content = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("OpenRouter-Antwort enthält keinen Inhalt") from exc
    if isinstance(content, dict):
        return content
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", str(content).strip(), flags=re.IGNORECASE)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise OpenRouterError("OpenRouter-Antwort ist kein gültiges JSON") from exc
    if not isinstance(parsed, dict):
        raise OpenRouterError("OpenRouter-Antwort hat ein unerwartetes Format")
    return parsed
