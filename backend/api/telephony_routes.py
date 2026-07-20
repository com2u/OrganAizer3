"""REST API for the Telefonie page.

All endpoints are auth-guarded (OpenWebUI token) and mounted under
``/api/telephony``. They cover:

- configuration (read/write, secrets write-only)  -> config_store
- browser Dialog access token                     -> livekit_token
- call history + dialog log                       -> call_log
- outbound calls / stack status                   -> voice_client
- text assistant chat                             -> text_assistant
"""

from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from backend import auth
from backend.telephony import (
    call_log, config_store, livekit_token, phonebook_store, text_assistant,
    voice_client,
)

logger = logging.getLogger(__name__)

telephony_bp = Blueprint("telephony", __name__)


@telephony_bp.before_request
def _enforce_auth():
    return auth.enforce_auth()


# ── configuration ──────────────────────────────────────────────────────────────

@telephony_bp.get("/config")
def get_config():
    return jsonify(config_store.public_config())


@telephony_bp.post("/config")
def save_config():
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid payload"}), 400
    try:
        updated = config_store.save_config(payload)
    except OSError:
        logger.exception("Failed to persist telephony config")
        return jsonify({"error": "Konfiguration konnte nicht gespeichert werden."}), 500
    return jsonify(updated)


# ── browser Dialog token (Sprache tab) ─────────────────────────────────────────

@telephony_bp.get("/web-token")
def web_token():
    try:
        return jsonify(livekit_token.issue_web_token())
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409


# ── stack status ───────────────────────────────────────────────────────────────

@telephony_bp.get("/status")
def status():
    cfg = config_store.public_config()
    return jsonify({
        "enabled": cfg.get("enabled") in ("true", "1", "yes", True),
        "phone_number": cfg.get("phone_number"),
        "provider": cfg.get("provider"),
        "voice": voice_client.status(),
    })


# ── call history ───────────────────────────────────────────────────────────────

@telephony_bp.get("/calls")
def list_calls():
    return jsonify(call_log.list_calls())


@telephony_bp.get("/calls/<int:call_id>")
def get_call(call_id: int):
    call = call_log.get_call(call_id)
    if not call:
        return jsonify({"error": "Call not found"}), 404
    return jsonify(call)


@telephony_bp.post("/calls")
def start_call():
    payload = request.get_json(silent=True) or {}
    number = str(payload.get("remote_number", "")).strip()
    if not number:
        return jsonify({"error": "Rufnummer fehlt."}), 400

    call = call_log.create_call(direction="outbound", remote_number=number,
                                status="initiated")
    try:
        result = voice_client.place_outbound_call(number, call_id=call["id"])
        room = result.get("room", "")
        call_log.add_dialog(call["id"], "system",
                            f"Ausgehender Anruf an {number} gestartet.", status="ok")
        detail = call_log.get_call(call["id"]) or call
        detail["room"] = room
        return jsonify(detail)
    except voice_client.VoiceServiceError as exc:
        call_log.add_dialog(call["id"], "system", str(exc), status="error")
        call_log.end_call(call["id"], summary="Anruf fehlgeschlagen")
        return jsonify({"error": str(exc)}), 502


@telephony_bp.post("/calls/<int:call_id>/end")
def end_call(call_id: int):
    call = call_log.get_call(call_id)
    if not call:
        return jsonify({"error": "Call not found"}), 404
    room = call.get("room")
    if room:
        try:
            voice_client.hangup(room)
        except voice_client.VoiceServiceError as exc:
            logger.warning("Hangup via voice service failed: %s", exc)
    ended = call_log.end_call(call_id)
    return jsonify(ended)


# ── phonebook (Telefonate tab) ─────────────────────────────────────────────────

@telephony_bp.get("/phonebook")
def list_phonebook():
    return jsonify(phonebook_store.list_contacts())


@telephony_bp.post("/phonebook")
def save_phonebook_contact():
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid payload"}), 400
    try:
        contact = phonebook_store.save_contact(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except OSError:
        logger.exception("Failed to persist phonebook contact")
        return jsonify({"error": "Kontakt konnte nicht gespeichert werden."}), 500
    return jsonify(contact)


@telephony_bp.delete("/phonebook/<path:number>")
def delete_phonebook_contact(number: str):
    try:
        ok = phonebook_store.delete_contact(number)
    except OSError:
        logger.exception("Failed to delete phonebook contact")
        return jsonify({"error": "Kontakt konnte nicht gelöscht werden."}), 500
    if not ok:
        return jsonify({"error": "Kontakt nicht gefunden."}), 404
    return jsonify({"deleted": True, "number": number})


# ── text assistant ─────────────────────────────────────────────────────────────

@telephony_bp.post("/voice")
def voice_message():
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()
    call_id = payload.get("call_id")
    if not message:
        return jsonify({"error": "Nachricht fehlt."}), 400

    if call_id:
        call_log.add_dialog(int(call_id), "user", message)

    result = text_assistant.ask(message)

    if call_id and result.get("reply"):
        call_log.add_dialog(int(call_id), "assistant", result["reply"])
    elif call_id and result.get("error"):
        call_log.add_dialog(int(call_id), "system", result["error"], status="error")

    status_code = 200 if result.get("reply") else 502
    return jsonify(result), status_code
