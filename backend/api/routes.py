"""REST API routes for Terminlandschaft."""

import hashlib
import json
import logging
import os
import tempfile

from flask import Blueprint, g, jsonify, request, send_file

from backend import auth
from backend.api.logging_middleware import clear_log_entries, get_log_entries
from backend.config import CONFIG_PATH, DB_PATH
from backend.db.sqlite_adapter import SQLiteAdapter

logger = logging.getLogger(__name__)

api_bp = Blueprint("api", __name__)


@api_bp.before_request
def _enforce_auth():
    """Protect all /api routes (except login) with OpenWebUI-based auth."""
    return auth.enforce_auth()


@api_bp.route("/auth/login", methods=["POST"])
def auth_login():
    """Authenticate against OpenWebUI and return a session token."""
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    if not email or not password:
        return jsonify({"error": "E-Mail und Passwort erforderlich"}), 400
    try:
        data = auth.signin(email, password)
    except Exception:
        logger.exception("Auth backend unreachable")
        return jsonify({"error": "Anmeldedienst nicht erreichbar"}), 503
    if not data:
        return jsonify({"error": "E-Mail oder Passwort ist falsch"}), 401
    return jsonify({"token": data["token"], "user": auth.public_user(data)})


@api_bp.route("/auth/me", methods=["GET"])
def auth_me():
    """Return the currently authenticated user."""
    user = getattr(g, "user", None)
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify(auth.public_user(user))


def get_db() -> SQLiteAdapter:
    """Create and return a database connection."""
    db = SQLiteAdapter(DB_PATH)
    db.connect()
    return db


def _add_minutes(time_str: str, minutes: int) -> str:
    """Add minutes to a HH:MM time string."""
    parts = time_str.split(":")
    total = int(parts[0]) * 60 + int(parts[1]) + minutes
    return f"{total // 60:02d}:{total % 60:02d}"


@api_bp.route("/weeks", methods=["GET"])
def get_weeks():
    """Return list of available calendar weeks."""
    db = get_db()
    try:
        rows = db.fetchall("SELECT DISTINCT woche FROM terminliste ORDER BY woche")
        return jsonify([r["woche"] for r in rows])
    finally:
        db.disconnect()


@api_bp.route("/week/<int:week>", methods=["GET"])
def get_week_appointments(week: int):
    """Return all appointments for a given week with full details."""
    db = get_db()
    try:
        rows = db.fetchall(
            """
            SELECT
                tl.id,
                tl.woche,
                tl.tag,
                tl.start,
                t.bespr_nr,
                t.bezeichnung,
                t.intervall,
                t.dauer_min,
                i.bedeutung as intervall_text
            FROM terminliste tl
            JOIN termine t ON tl.meeting = t.bespr_nr
            LEFT JOIN intervalle i ON t.intervall = i.kuerzel
            WHERE tl.woche = ?
            ORDER BY
                CASE tl.tag
                    WHEN 'Mon' THEN 1
                    WHEN 'Tue' THEN 2
                    WHEN 'Wed' THEN 3
                    WHEN 'Thu' THEN 4
                    WHEN 'Fri' THEN 5
                    WHEN 'Sat' THEN 6
                    WHEN 'Sun' THEN 7
                END,
                tl.start,
                tl.id
            """,
            (week,),
        )

        result = []
        for r in rows:
            participants = db.fetchall(
                "SELECT usergruppe FROM termin_teilnehmer WHERE bespr_nr = ? ORDER BY rowid",
                (r["bespr_nr"],),
            )
            participant_codes = [p["usergruppe"] for p in participants]

            # Determine bereich groups for filtering
            bereich_groups = set()
            for code in participant_codes:
                if len(code) == 1:
                    bereich_groups.add(code)
                else:
                    bereich_groups.add(code[0])

            result.append(
                {
                    "id": r["id"],
                    "woche": r["woche"],
                    "tag": r["tag"],
                    "start": r["start"],
                    "ende": _add_minutes(r["start"], r["dauer_min"]),
                    "bespr_nr": r["bespr_nr"],
                    "bezeichnung": r["bezeichnung"],
                    "intervall": r["intervall"],
                    "intervall_text": r["intervall_text"],
                    "dauer_min": r["dauer_min"],
                    "teilnehmer": participant_codes,
                    "bereich_groups": sorted(bereich_groups),
                }
            )
        return jsonify(result)
    finally:
        db.disconnect()


@api_bp.route("/termine/<int:nr>", methods=["GET"])
def get_termin_detail(nr: int):
    """Return full meeting details for the detail modal."""
    db = get_db()
    try:
        termin = db.fetchone(
            """
            SELECT t.bespr_nr, t.bezeichnung, t.intervall, t.dauer_min,
                   i.bedeutung as intervall_text
            FROM termine t
            LEFT JOIN intervalle i ON t.intervall = i.kuerzel
            WHERE t.bespr_nr = ?
            """,
            (nr,),
        )
        if not termin:
            return jsonify({"error": "Not found"}), 404

        # Get participant codes and resolve names
        participants = db.fetchall(
            "SELECT usergruppe FROM termin_teilnehmer WHERE bespr_nr = ? ORDER BY rowid",
            (nr,),
        )

        resolved = []
        for p in participants:
            code = p["usergruppe"]
            if len(code) == 1:
                # Entire department
                members = db.fetchall(
                    "SELECT nummer, bezeichnung, name FROM usergruppen WHERE bereich = ? ORDER BY nummer",
                    (code,),
                )
                resolved.append(
                    {
                        "code": code,
                        "type": "group",
                        "members": [
                            {
                                "nummer": m["nummer"],
                                "bezeichnung": m["bezeichnung"],
                                "name": m["name"],
                            }
                            for m in members
                        ],
                    }
                )
            else:
                ug = db.fetchone(
                    "SELECT nummer, bezeichnung, name, bereich FROM usergruppen WHERE nummer = ?",
                    (code,),
                )
                if ug:
                    resolved.append(
                        {
                            "code": code,
                            "type": "individual",
                            "nummer": ug["nummer"],
                            "bezeichnung": ug["bezeichnung"],
                            "name": ug["name"],
                            "bereich": ug["bereich"],
                        }
                    )
                else:
                    resolved.append({"code": code, "type": "unknown"})

        # Get scheduled instances
        instances = db.fetchall(
            """
            SELECT woche, tag, start FROM terminliste
            WHERE meeting = ?
            ORDER BY woche,
                CASE tag
                    WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3
                    WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5
                END
            """,
            (nr,),
        )

        return jsonify(
            {
                "bespr_nr": termin["bespr_nr"],
                "bezeichnung": termin["bezeichnung"],
                "intervall": termin["intervall"],
                "intervall_text": termin["intervall_text"],
                "dauer_min": termin["dauer_min"],
                "teilnehmer": resolved,
                "instances": [dict(i) for i in instances],
            }
        )
    finally:
        db.disconnect()


@api_bp.route("/bereiche", methods=["GET"])
def get_bereiche():
    """Return all department groups."""
    db = get_db()
    try:
        rows = db.fetchall("SELECT gruppe, bereich FROM bereiche ORDER BY gruppe")
        return jsonify(rows)
    finally:
        db.disconnect()


@api_bp.route("/usergruppen", methods=["GET"])
def get_usergruppen():
    """Return all user groups."""
    db = get_db()
    try:
        rows = db.fetchall(
            "SELECT nummer, bereich, bezeichnung, name FROM usergruppen ORDER BY nummer"
        )
        return jsonify(rows)
    finally:
        db.disconnect()


@api_bp.route("/intervalle", methods=["GET"])
def get_intervalle():
    """Return all interval codes."""
    db = get_db()
    try:
        rows = db.fetchall("SELECT kuerzel, bedeutung FROM intervalle ORDER BY kuerzel")
        return jsonify(rows)
    finally:
        db.disconnect()


@api_bp.route("/import", methods=["POST"])
def import_data():
    """Upload an Excel file and import it into the database."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.endswith(".xlsx"):
        return jsonify({"error": "File must be .xlsx"}), 400

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        from backend.services.import_service import import_excel

        import_db = get_db()
        try:
            import_db.create_tables()
            import_excel(import_db, tmp_path)
        finally:
            import_db.disconnect()
        return jsonify({"status": "ok", "message": "Import successful"})
    except Exception as e:
        logger.exception("Import failed")
        return jsonify({"error": str(e)}), 500
    finally:
        os.unlink(tmp_path)


@api_bp.route("/export", methods=["GET"])
def export_data():
    """Export the database as an Excel file."""
    from backend.services.export_service import export_excel

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        export_db = get_db()
        try:
            export_excel(export_db, tmp_path)
        finally:
            export_db.disconnect()
        return send_file(
            tmp_path,
            as_attachment=True,
            download_name="terminlandschaft_export.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        logger.exception("Export failed")
        return jsonify({"error": str(e)}), 500


# ===== Logs API =====


@api_bp.route("/logs", methods=["GET"])
def get_logs():
    """Return recent backend log entries for the Settings logging panel.

    Query params:
        since_id: only return entries with id > since_id (for polling)
    """
    since_id = request.args.get("since_id", 0, type=int)
    entries = get_log_entries(since_id)
    return jsonify({"entries": entries})


@api_bp.route("/logs/clear", methods=["POST"])
def clear_logs():
    """Clear the in-memory log buffer."""
    clear_log_entries()
    return jsonify({"status": "ok"})


# ===== Config API =====

_CONFIG_DEFAULTS = {
    "tts_auto_play": True,
    "tts_auto_download": False,
    "youtube_default_format": "audio",
    "youtube_default_quality": "medium",
    "bilder_auto_show": True,
    "bilder_auto_download": False,
    "bilder_default_style": "realistic",
    "bilder_default_quality": "hd",
    "ocr_auto_extract": True,
    "ocr_default_language": "de",
    "obsidian_vault_path": "/vault/obsidian",
    "obsidian_api_url": "http://localhost:8090",
    "hermes_api_url": "http://localhost:8080",
}

_CONFIG_TYPES = {
    "tts_auto_play": bool,
    "tts_auto_download": bool,
    "youtube_default_format": str,
    "youtube_default_quality": str,
    "bilder_auto_show": bool,
    "bilder_auto_download": bool,
    "bilder_default_style": str,
    "bilder_default_quality": str,
    "ocr_auto_extract": bool,
    "ocr_default_language": str,
    "obsidian_vault_path": str,
    "obsidian_api_url": str,
    "hermes_api_url": str,
}


def _read_config() -> dict:
    """Read persisted UI configuration, falling back to safe defaults."""
    try:
        with open(CONFIG_PATH, encoding="utf-8") as config_file:
            stored = json.load(config_file)
        if not isinstance(stored, dict):
            stored = {}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        stored = {}
    return {**_CONFIG_DEFAULTS, **{
        key: value for key, value in stored.items()
        if key in _CONFIG_TYPES and isinstance(value, _CONFIG_TYPES[key])
    }}


def _write_config(config: dict) -> None:
    """Atomically persist configuration below the host-mounted data folder."""
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    directory = os.path.dirname(CONFIG_PATH) or "."
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=directory, delete=False
    ) as config_file:
        json.dump(config, config_file, ensure_ascii=False, indent=2)
        config_file.write("\n")
        temporary_path = config_file.name
    os.replace(temporary_path, CONFIG_PATH)


@api_bp.route("/config", methods=["GET"])
def get_config():
    """Return persisted configuration merged with current defaults."""
    return jsonify(_read_config())


@api_bp.route("/config", methods=["POST"])
def save_config():
    """Validate and persist the supported UI configuration fields."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON object required"}), 400
    invalid = [
        key for key, value in body.items()
        if key not in _CONFIG_TYPES or not isinstance(value, _CONFIG_TYPES[key])
    ]
    if invalid:
        return jsonify({"error": "Invalid configuration fields", "fields": invalid}), 400
    config = {**_read_config(), **body}
    try:
        _write_config(config)
    except OSError:
        logger.exception("Configuration save failed")
        return jsonify({"error": "Configuration could not be saved"}), 500
    return jsonify(config)


# ===== Telephony API =====

# Sensitive fields that must never appear in responses
_SIP_SECRET_FIELDS = {"sip_password_hash"}

# Valid modes for the SIP gateway
_SIP_MODES = {"disabled", "demo", "webhook", "sipjs"}


def _hash_sip_password(password: str) -> str:
    """Salted iterated PBKDF2-HMAC-SHA256 hash for SIP password storage.

    Format: ``pbkdf2:<iterations>:<hex-salt>:<hex-dk>``

    NOTE: This hash is intentionally NOT reversible.  It cannot be used to
    recover the plaintext password required for SIP REGISTER authentication.
    Real provider deployments MUST use a dedicated secret-management system
    or a provider-specific adapter that stores credentials securely (e.g.
    HashiCorp Vault, AWS Secrets Manager) rather than relying on this hash.
    """
    import os as _os
    salt = _os.urandom(16)
    iterations = 260_000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2:{iterations}:{salt.hex()}:{dk.hex()}"


def _verify_sip_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored PBKDF2 hash."""
    if not stored_hash or not stored_hash.startswith("pbkdf2:"):
        return False
    try:
        _, iterations_s, salt_hex, dk_hex = stored_hash.split(":")
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"),
            bytes.fromhex(salt_hex), int(iterations_s),
        )
        return dk.hex() == dk_hex
    except (ValueError, TypeError):
        return False


# Valid transports for SIP
_SIP_TRANSPORTS = {"wss", "ws", "udp", "tcp"}


def _sanitize_sip_row(row: dict) -> dict:
    """Remove secret fields from a SIP config row before returning."""
    return {k: v for k, v in row.items() if k not in _SIP_SECRET_FIELDS}


def _ensure_telephony_tables(db: SQLiteAdapter) -> None:
    """Create telephony tables if they don't exist yet."""
    from backend.db.models import CREATE_TABLES

    for stmt in CREATE_TABLES:
        if "sip_config" in stmt or "calls" in stmt or "call_dialog_entries" in stmt:
            db.execute(stmt)


def _get_sip_mode(db: SQLiteAdapter) -> str:
    """Return the current SIP gateway mode, defaulting to 'disabled'."""
    row = db.fetchone("SELECT mode FROM sip_config WHERE id = 1")
    return row["mode"] if row else "disabled"


@api_bp.route("/telephony/config", methods=["GET"])
def get_sip_config():
    """Return the SIP gateway configuration (secrets redacted)."""
    db = get_db()
    try:
        _ensure_telephony_tables(db)
        row = db.fetchone("SELECT * FROM sip_config WHERE id = 1")
        if not row:
            return jsonify({
                "mode": "disabled",
                "sip_server": "",
                "sip_port": 5060,
                "sip_username": "",
                "sip_transport": "wss",
                "stun_server": "",
                "webhook_url": "",
                "has_password": False,
                "updated_at": None,
            })
        result = _sanitize_sip_row(dict(row))
        result["has_password"] = bool(row.get("sip_password_hash"))
        return jsonify(result)
    finally:
        db.disconnect()


@api_bp.route("/telephony/config", methods=["POST"])
def save_sip_config():
    """Create or update the SIP gateway configuration."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON object required"}), 400

    mode = body.get("mode", "disabled")
    if mode not in _SIP_MODES:
        return jsonify({"error": f"Invalid mode. Must be one of: {', '.join(sorted(_SIP_MODES))}"}), 400

    # --- Validate sip_port ---
    sip_port = body.get("sip_port")
    if sip_port is not None:
        try:
            sip_port = int(sip_port)
        except (ValueError, TypeError):
            return jsonify({"error": "sip_port must be an integer"}), 400
        if not (1 <= sip_port <= 65535):
            return jsonify({"error": "sip_port must be between 1 and 65535"}), 400

    # --- Validate sip_transport ---
    sip_transport = body.get("sip_transport")
    if sip_transport is not None and sip_transport not in _SIP_TRANSPORTS:
        return jsonify({"error": f"sip_transport must be one of: {', '.join(sorted(_SIP_TRANSPORTS))}"}), 400

    # --- Validate webhook_url ---
    webhook_url = body.get("webhook_url")
    if webhook_url is not None and webhook_url != "":
        if not (webhook_url.startswith("https://") or webhook_url.startswith("http://")):
            return jsonify({"error": "webhook_url must be a valid HTTP(S) URL"}), 400

    db = get_db()
    try:
        _ensure_telephony_tables(db)
        existing = db.fetchone("SELECT * FROM sip_config WHERE id = 1")

        password_hash = ""
        if "sip_password" in body and body["sip_password"]:
            password_hash = _hash_sip_password(body["sip_password"])
        elif existing:
            password_hash = existing["sip_password_hash"] or ""

        if existing:
            db.execute(
                """UPDATE sip_config SET
                    mode = ?, sip_server = ?, sip_port = ?, sip_username = ?,
                    sip_password_hash = ?, sip_transport = ?, stun_server = ?,
                    webhook_url = ?, updated_at = datetime('now')
                WHERE id = 1""",
                (
                    mode,
                    body.get("sip_server", existing["sip_server"]),
                    body.get("sip_port", existing["sip_port"]),
                    body.get("sip_username", existing["sip_username"]),
                    password_hash,
                    body.get("sip_transport", existing["sip_transport"]),
                    body.get("stun_server", existing["stun_server"]),
                    body.get("webhook_url", existing["webhook_url"]),
                ),
            )
        else:
            db.execute(
                """INSERT INTO sip_config
                    (id, mode, sip_server, sip_port, sip_username, sip_password_hash,
                     sip_transport, stun_server, webhook_url)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    mode,
                    body.get("sip_server", ""),
                    body.get("sip_port", 5060),
                    body.get("sip_username", ""),
                    password_hash,
                    body.get("sip_transport", "wss"),
                    body.get("stun_server", ""),
                    body.get("webhook_url", ""),
                ),
            )

        row = db.fetchone("SELECT * FROM sip_config WHERE id = 1")
        result = _sanitize_sip_row(dict(row))
        result["has_password"] = bool(row.get("sip_password_hash"))
        return jsonify(result)
    finally:
        db.disconnect()


@api_bp.route("/telephony/calls", methods=["GET"])
def list_calls():
    """Return all calls ordered by most recent first."""
    db = get_db()
    try:
        _ensure_telephony_tables(db)
        rows = db.fetchall(
            "SELECT * FROM calls ORDER BY started_at DESC LIMIT 200"
        )
        return jsonify([dict(r) for r in rows])
    finally:
        db.disconnect()


@api_bp.route("/telephony/calls/<int:call_id>", methods=["GET"])
def get_call_detail(call_id: int):
    """Return a single call with its full dialog log."""
    db = get_db()
    try:
        _ensure_telephony_tables(db)
        call = db.fetchone("SELECT * FROM calls WHERE id = ?", (call_id,))
        if not call:
            return jsonify({"error": "Call not found"}), 404
        entries = db.fetchall(
            "SELECT * FROM call_dialog_entries WHERE call_id = ? ORDER BY timestamp ASC",
            (call_id,),
        )
        result = dict(call)
        result["dialog"] = [dict(e) for e in entries]
        return jsonify(result)
    finally:
        db.disconnect()


@api_bp.route("/telephony/calls", methods=["POST"])
def start_call():
    """Initiate a new call (demo/webhook mode only if configured)."""
    body = request.get_json(silent=True) or {}
    remote_number = (body.get("remote_number") or "").strip()
    direction = body.get("direction", "outbound")

    # --- Input validation ---
    if not remote_number:
        return jsonify({"error": "remote_number must not be empty"}), 400
    if direction not in ("inbound", "outbound"):
        return jsonify({"error": "direction must be 'inbound' or 'outbound'"}), 400

    db = get_db()
    try:
        _ensure_telephony_tables(db)
        mode = _get_sip_mode(db)

        if mode == "disabled":
            return jsonify({
                "error": "Telephony is disabled. Configure a SIP gateway first.",
                "mode": mode,
            }), 409

        if mode == "demo":
            # Demo mode: create the call record but mark it clearly as demo/simulated
            db.execute(
                "INSERT INTO calls (direction, remote_number, status, summary) VALUES (?, ?, 'demo', '[DEMO] Simulated call - no real connection')",
                (direction, remote_number),
            )
            call = db.fetchone("SELECT * FROM calls ORDER BY id DESC LIMIT 1")
            # Add a system dialog entry
            db.execute(
                "INSERT INTO call_dialog_entries (call_id, role, content, status) VALUES (?, 'system', 'Demo mode: no real SIP connection established.', 'info')",
                (call["id"],),
            )
            call_dialog = db.fetchall(
                "SELECT * FROM call_dialog_entries WHERE call_id = ? ORDER BY timestamp ASC",
                (call["id"],),
            )
            result = dict(call)
            result["dialog"] = [dict(entry) for entry in call_dialog]
            return jsonify(result), 201

        if mode == "webhook":
            config = db.fetchone("SELECT webhook_url FROM sip_config WHERE id = 1")
            webhook_url = config["webhook_url"] if config else ""
            if not webhook_url:
                return jsonify({"error": "Webhook URL not configured"}), 409
            # Create the call record
            db.execute(
                "INSERT INTO calls (direction, remote_number, status, summary) VALUES (?, ?, 'initiated', 'Webhook dispatch pending')",
                (direction, remote_number),
            )
            call = db.fetchone("SELECT * FROM calls ORDER BY id DESC LIMIT 1")
            call_id_val = call["id"]

            # Actually dispatch to the configured webhook provider
            import urllib.request
            import urllib.error
            try:
                payload = json.dumps({
                    "remote_number": remote_number,
                    "direction": direction,
                    "call_id": call_id_val,
                }).encode("utf-8")
                req = urllib.request.Request(
                    webhook_url,
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp.read()  # consume response
                db.execute(
                    "UPDATE calls SET status = 'active', summary = 'Webhook provider notified' WHERE id = ?",
                    (call_id_val,),
                )
            except Exception as exc:
                logger.warning("Webhook dispatch failed: %s", type(exc).__name__)
                # Record redacted error as system dialog entry
                redacted_msg = f"Webhook provider error: {type(exc).__name__} (details redacted)"
                db.execute(
                    "INSERT INTO call_dialog_entries (call_id, role, content, status) VALUES (?, 'system', ?, 'error')",
                    (call_id_val, redacted_msg),
                )
                db.execute(
                    "UPDATE calls SET status = 'error', summary = 'Webhook dispatch failed' WHERE id = ?",
                    (call_id_val,),
                )
                call = db.fetchone("SELECT * FROM calls WHERE id = ?", (call_id_val,))
                result = dict(call)
                result["dialog"] = []
                return jsonify({"error": redacted_msg, "call": result}), 502

            call = db.fetchone("SELECT * FROM calls WHERE id = ?", (call_id_val,))
            result = dict(call)
            result["dialog"] = []
            return jsonify(result), 201

        if mode == "sipjs":
            # SIP.js mode: call is handled client-side, we just record it
            db.execute(
                "INSERT INTO calls (direction, remote_number, status) VALUES (?, ?, 'initiated')",
                (direction, remote_number),
            )
            call = db.fetchone("SELECT * FROM calls ORDER BY id DESC LIMIT 1")
            result = dict(call)
            result["dialog"] = []
            return jsonify(result), 201

        return jsonify({"error": f"Unknown mode: {mode}"}), 500
    finally:
        db.disconnect()


@api_bp.route("/telephony/calls/<int:call_id>/end", methods=["POST"])
def end_call(call_id: int):
    """End/hang up a call."""
    db = get_db()
    try:
        _ensure_telephony_tables(db)
        call = db.fetchone("SELECT * FROM calls WHERE id = ?", (call_id,))
        if not call:
            return jsonify({"error": "Call not found"}), 404
        db.execute(
            """UPDATE calls SET status = 'ended',
               ended_at = datetime('now'),
               duration_seconds = CAST((julianday(datetime('now')) - julianday(started_at)) * 86400 AS INTEGER)
            WHERE id = ?""",
            (call_id,),
        )
        updated = db.fetchone("SELECT * FROM calls WHERE id = ?", (call_id,))
        return jsonify(dict(updated))
    finally:
        db.disconnect()


@api_bp.route("/telephony/calls/<int:call_id>/dialog", methods=["POST"])
def add_dialog_entry(call_id: int):
    """Add a dialog entry (voice message) to a call."""
    body = request.get_json(silent=True) or {}
    role = body.get("role", "user")
    content = body.get("content", "")
    status = body.get("status", "ok")

    if role not in ("user", "assistant", "system"):
        return jsonify({"error": "Role must be user, assistant, or system"}), 400

    db = get_db()
    try:
        _ensure_telephony_tables(db)
        call = db.fetchone("SELECT * FROM calls WHERE id = ?", (call_id,))
        if not call:
            return jsonify({"error": "Call not found"}), 404

        db.execute(
            "INSERT INTO call_dialog_entries (call_id, role, content, status) VALUES (?, ?, ?, ?)",
            (call_id, role, content, status),
        )
        entry = db.fetchone(
            "SELECT * FROM call_dialog_entries ORDER BY id DESC LIMIT 1"
        )
        return jsonify(dict(entry)), 201
    finally:
        db.disconnect()


@api_bp.route("/telephony/voice", methods=["POST"])
def voice_message():
    """Send a voice message to Hermes and get a response.

    In demo mode, returns a canned response.
    In other modes, forwards to the configured Hermes API.
    """
    body = request.get_json(silent=True) or {}
    message = (body.get("message") or "").strip()
    call_id = body.get("call_id")

    if not message:
        return jsonify({"error": "Message is required"}), 400

    db = get_db()
    try:
        _ensure_telephony_tables(db)
        mode = _get_sip_mode(db)

        # Record user message if call_id provided
        if call_id:
            call = db.fetchone("SELECT * FROM calls WHERE id = ?", (call_id,))
            if call:
                db.execute(
                    "INSERT INTO call_dialog_entries (call_id, role, content, status) VALUES (?, 'user', ?, 'ok')",
                    (call_id, message),
                )

        if mode == "disabled":
            return jsonify({
                "error": "Telephony is disabled. Configure a SIP gateway first.",
                "mode": mode,
            }), 409

        if mode == "demo":
            reply = f"[DEMO] Hermes hat Ihre Nachricht erhalten: \"{message}\". Dies ist eine Simulation – im Produktionsmodus wird diese Nachricht an den KI-Assistenten weitergeleitet."
            if call_id:
                db.execute(
                    "INSERT INTO call_dialog_entries (call_id, role, content, status) VALUES (?, 'assistant', ?, 'demo')",
                    (call_id, reply),
                )
            return jsonify({"reply": reply, "mode": "demo"})

        # For webhook/sipjs modes, try to forward to Hermes API
        config = _read_config()
        hermes_url = config.get("hermes_api_url", "")
        if not hermes_url:
            return jsonify({
                "error": "Hermes API URL not configured. Set hermes_api_url in application configuration.",
                "mode": mode,
            }), 409

        # Attempt to forward the message to Hermes
        import urllib.request
        import urllib.error

        try:
            req_data = json.dumps({"message": message}).encode("utf-8")
            req = urllib.request.Request(
                f"{hermes_url}/api/v1/chat",
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                reply = resp_data.get("reply", resp_data.get("message", str(resp_data)))
        except (urllib.error.URLError, urllib.error.HTTPError, Exception) as e:
            logger.warning("Hermes API call failed: %s", e)
            reply = f"Hermes API nicht erreichbar ({type(e).__name__}). Bitte prüfen Sie die Konfiguration."
            if call_id:
                db.execute(
                    "INSERT INTO call_dialog_entries (call_id, role, content, status) VALUES (?, 'system', ?, 'error')",
                    (call_id, reply),
                )
            return jsonify({"error": reply, "mode": mode}), 502

        if call_id:
            db.execute(
                "INSERT INTO call_dialog_entries (call_id, role, content, status) VALUES (?, 'assistant', ?, 'ok')",
                (call_id, reply),
            )
        return jsonify({"reply": reply, "mode": mode})
    finally:
        db.disconnect()


# ===== TTS / STT / YouTube / OCR / Hermes Execute =====

import re
import urllib.parse

_YOUTUBE_URL_RE = re.compile(
    r"^https?://(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)[\w\-]{11}([&?][\w\-=&%.]*)?$"
)
_ALLOWED_AUDIO_TYPES = {"audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg",
                        "audio/webm", "audio/flac", "audio/x-wav", "audio/mp4",
                        "audio/webm;codecs=opus", "audio/ogg;codecs=opus",
                        "application/ogg", "audio/x-flac"}
_ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/gif",
                        "image/tiff", "image/bmp", "image/webp"}
_MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50 MB
_MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")


def _safe_filename(name: str) -> str:
    """Sanitize a filename to prevent path traversal."""
    name = os.path.basename(name)
    name = re.sub(r"[^\w.\-]", "_", name)
    return name or "file"


def _user_dir(subdir: str) -> str:
    """Return a per-user directory under data/, creating it if needed."""
    user = getattr(g, "user", None)
    user_id = "anonymous"
    if user:
        email = user.get("email", "") if isinstance(user, dict) else getattr(user, "email", "")
        if email:
            user_id = hashlib.sha256(email.encode()).hexdigest()[:16]
    path = os.path.join(DATA_DIR, subdir, user_id)
    os.makedirs(path, exist_ok=True)
    return path


@api_bp.route("/tts/generate", methods=["POST"])
def tts_generate():
    """Generate speech from text using edge-tts (Microsoft Edge TTS, free, no API key).

    Uses the edge-tts Python library which provides high-quality neural voices
    in many languages. Audio is saved to a per-user directory and served back.
    """
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Text ist erforderlich / Text is required"}), 400
    if len(text) > 10000:
        return jsonify({"error": "Text zu lang (max 10.000 Zeichen) / Text too long (max 10,000 chars)"}), 400

    voice = body.get("voice", "de-DE-KatjaNeural")
    speed_str = body.get("speed", "1.0")

    # Validate speed
    try:
        speed = float(speed_str)
    except (ValueError, TypeError):
        speed = 1.0
    rate = f"{'+' if speed >= 1 else ''}{int((speed - 1) * 100)}%"

    try:
        import edge_tts
        import asyncio

        output_dir = _user_dir("tts")
        # Generate unique filename
        file_id = hashlib.md5(os.urandom(16)).hexdigest()[:16]
        audio_filename = f"tts_{file_id}.mp3"
        audio_path = os.path.join(output_dir, audio_filename)

        async def _generate():
            communicate = edge_tts.Communicate(text, voice, rate=rate)
            await communicate.save(audio_path)

        asyncio.run(_generate())

        # Verify file was created
        if not os.path.isfile(audio_path) or os.path.getsize(audio_path) == 0:
            return jsonify({"error": "TTS-Audio konnte nicht generiert werden / TTS audio could not be generated"}), 500

        # Build download URL
        user_hash = hashlib.sha256(
            (g.user.get("email", "") if isinstance(g.user, dict) else "").encode()
        ).hexdigest()[:16]
        download_url = f"/api/tts/file/{user_hash}/{audio_filename}"
        return jsonify({"audio_url": download_url, "filename": audio_filename})

    except ImportError:
        logger.error("edge-tts not installed")
        return jsonify({"error": "TTS-Modul nicht installiert (edge-tts) / TTS module not installed (edge-tts)"}), 500
    except Exception as e:
        logger.warning("TTS generation failed: %s", type(e).__name__)
        return jsonify({
            "error": f"TTS-Fehler: {str(e)[:200]} / TTS error",
        }), 502


@api_bp.route("/tts/file/<user_hash>/<path:filename>", methods=["GET"])
def tts_serve_file(user_hash: str, filename: str):
    """Serve a generated TTS audio file. Only the owning user can access it."""
    user = getattr(g, "user", None)
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    email = user.get("email", "") if isinstance(user, dict) else getattr(user, "email", "")
    expected_hash = hashlib.sha256(email.encode()).hexdigest()[:16]
    if user_hash != expected_hash:
        return jsonify({"error": "Zugriff verweigert / Access denied"}), 403

    safe_name = _safe_filename(filename)
    filepath = os.path.join(DATA_DIR, "tts", user_hash, safe_name)
    if not os.path.isfile(filepath):
        return jsonify({"error": "Datei nicht gefunden / File not found"}), 404

    return send_file(filepath, as_attachment=True, download_name=safe_name)


@api_bp.route("/stt/transcribe", methods=["POST"])
def stt_transcribe():
    """Transcribe an uploaded audio file using openai-whisper (local, free, no API key).

    Accepts multipart form data with an 'audio' file field and optional
    'language' field (default: 'de'). Uses the whisper Python library
    to transcribe the audio locally.
    """
    if "audio" not in request.files:
        return jsonify({"error": "Audio-Datei erforderlich / Audio file required"}), 400

    audio_file = request.files["audio"]
    if not audio_file.filename:
        return jsonify({"error": "Dateiname fehlt / Missing filename"}), 400

    # Validate content type (strip codec suffix, e.g. "audio/webm;codecs=opus" -> "audio/webm")
    content_type = audio_file.content_type or ""
    base_content_type = content_type.split(";")[0].strip().lower()
    if content_type and content_type not in _ALLOWED_AUDIO_TYPES and base_content_type not in _ALLOWED_AUDIO_TYPES:
        return jsonify({"error": f"Ungültiger Dateityp: {content_type}. Erlaubt: WAV, MP3, OGG, WebM, FLAC / Invalid file type"}), 400

    # Read and check size
    audio_data = audio_file.read()
    if len(audio_data) > _MAX_AUDIO_SIZE:
        return jsonify({"error": "Datei zu groß (max 50 MB) / File too large (max 50 MB)"}), 400

    language = request.form.get("language", "de")

    # Save to temp file for whisper
    import tempfile
    safe_name = _safe_filename(audio_file.filename)
    # Ensure .wav extension for whisper compatibility
    if not safe_name.endswith((".wav", ".mp3", ".ogg", ".webm", ".flac", ".m4a")):
        safe_name += ".wav"

    try:
        import whisper

        # Load model (tiny for speed, base for better accuracy)
        model = whisper.load_model("base")

        # Write audio to temp file
        with tempfile.NamedTemporaryFile(suffix=f"_{safe_name}", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            # Transcribe
            result = model.transcribe(tmp_path, language=language if language != "auto" else None)
            text = result.get("text", "").strip()
            return jsonify({"text": text})
        finally:
            os.unlink(tmp_path)

    except ImportError:
        logger.error("whisper not installed")
        return jsonify({"error": "STT-Modul nicht installiert (openai-whisper) / STT module not installed (openai-whisper)"}), 500
    except Exception as e:
        logger.warning("STT transcription failed: %s", type(e).__name__)
        return jsonify({
            "error": f"STT-Fehler: {str(e)[:200]} / STT error",
        }), 502


@api_bp.route("/youtube/download", methods=["POST"])
def youtube_download():
    """Download a YouTube video/audio.

    Validates the URL against a strict allowlist of YouTube domains to
    prevent SSRF. Requires yt-dlp to be installed in the container.
    """
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()
    fmt = body.get("format", "audio")

    if not url:
        return jsonify({"error": "YouTube-URL erforderlich / YouTube URL required"}), 400

    # Strict URL validation against SSRF
    if not _YOUTUBE_URL_RE.match(url):
        return jsonify({"error": "Ungültige YouTube-URL. Nur youtube.com und youtu.be erlaubt. / Invalid YouTube URL."}), 400

    if fmt not in ("audio", "video"):
        return jsonify({"error": "Format muss 'audio' oder 'video' sein / Format must be 'audio' or 'video'"}), 400

    # Check if yt-dlp is available
    import shutil
    if not shutil.which("yt-dlp"):
        return jsonify({
            "error": "yt-dlp ist nicht installiert. Bitte im Container installieren. / yt-dlp is not installed.",
            "config_required": "yt-dlp binary",
        }), 409

    import subprocess
    import glob as glob_mod

    output_dir = _user_dir("youtube")

    # Ensure deno is in PATH (needed by newer yt-dlp for YouTube JS extraction)
    env = os.environ.copy()
    deno_bin = os.path.expanduser("~/.deno/bin")
    if os.path.isdir(deno_bin):
        env["PATH"] = f"{deno_bin}:{env.get('PATH', '')}"

    # Use android_vr player client (more permissive, bypasses bot detection better)
    player_client = "android_vr"

    try:
        if fmt == "audio":
            cmd = [
                "yt-dlp", "--no-playlist", "--max-filesize", "200M",
                "-x", "--audio-format", "mp3",
                "--audio-quality", "0",
                "-o", os.path.join(output_dir, "%(title)s.%(ext)s"),
                "--restrict-filenames",
                "--socket-timeout", "30",
                "--retries", "3",
                "--extractor-args", f"youtube:player_client={player_client}",
                url,
            ]
        else:
            cmd = [
                "yt-dlp", "--no-playlist", "--max-filesize", "500M",
                "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "--merge-output-format", "mp4",
                "-o", os.path.join(output_dir, "%(title)s.%(ext)s"),
                "--restrict-filenames",
                "--socket-timeout", "30",
                "--retries", "3",
                "--extractor-args", f"youtube:player_client={player_client}",
                url,
            ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)

        if result.returncode != 0:
            error_msg = result.stderr.strip().split("\n")[-1] if result.stderr else "Download failed"
            error_msg = error_msg[:300]
            logger.warning("yt-dlp failed (direct): %s", error_msg)
            # Check for bot detection
            if "Sign in to confirm" in error_msg or "not a bot" in error_msg or "LOGIN_REQUIRED" in error_msg:
                # Try with SOCKS5 proxy fallback
                proxy_result = _try_youtube_with_proxy(cmd, url, output_dir, fmt, env)
                if proxy_result is not None:
                    return proxy_result
                return jsonify({"error": "YouTube blockiert den Download von dieser Server-IP (Bot-Erkennung). Proxy-Fallback fehlgeschlagen. / YouTube blocks downloads from this server IP (bot detection). Proxy fallback failed."}), 502
            return jsonify({"error": f"Download fehlgeschlagen: {error_msg} / Download failed"}), 500

        # Find the downloaded file
        files = sorted(glob_mod.glob(os.path.join(output_dir, "*")), key=os.path.getmtime, reverse=True)
        if not files:
            return jsonify({"error": "Keine Datei gefunden / No file found"}), 500

        latest = files[0]
        filename = os.path.basename(latest)
        file_size = os.path.getsize(latest)
        if file_size == 0:
            return jsonify({"error": "Heruntergeladene Datei ist leer / Downloaded file is empty"}), 500
        # Return download URL relative to API
        download_url = f"/api/youtube/file/{hashlib.sha256(g.user.get('email', '').encode() if isinstance(g.user, dict) else b'anon').hexdigest()[:16]}/{urllib.parse.quote(filename)}"
        return jsonify({"download_url": download_url, "filename": filename, "size": file_size})

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Download-Zeitlimit überschritten (5 Min.) / Download timeout (5 min)"}), 504
    except Exception as e:
        logger.warning("YouTube download error: %s", type(e).__name__)
        return jsonify({"error": f"Fehler: {type(e).__name__} / Error: {type(e).__name__}"}), 500


def _try_youtube_with_proxy(original_cmd: list, url: str, output_dir: str, fmt: str, env: dict) -> "tuple | None":
    """Try downloading YouTube video through free SOCKS5 proxies.

    Fetches a list of free SOCKS5 proxies, iterates through them until
    one works, and downloads the video through that proxy using the
    android_vr player client.

    Returns a (jsonify_response, status_code) tuple on success, or None if all proxies fail.
    """
    import subprocess
    import urllib.request as ur_req

    logger.info("Attempting YouTube download with SOCKS5 proxy fallback")

    # Fetch proxy list
    try:
        proxy_urls = [
            "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all&ssl=all&anonymity=all",
            "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt",
        ]
        proxies = []
        for purl in proxy_urls:
            try:
                req = ur_req.Request(purl, method="GET")
                with ur_req.urlopen(req, timeout=10) as resp:
                    text = resp.read().decode("utf-8")
                    for line in text.strip().split("\n"):
                        line = line.strip()
                        if line and ":" in line and not line.startswith("#"):
                            proxies.append(line)
                if proxies:
                    break
            except Exception:
                continue

        if not proxies:
            logger.warning("No SOCKS5 proxies found")
            return None

        logger.info("Found %d SOCKS5 proxies to try", len(proxies))
    except Exception as e:
        logger.warning("Failed to fetch proxy list: %s", e)
        return None

    # Try each proxy (limit to first 10 to avoid long waits)
    max_attempts = min(len(proxies), 10)
    for i, proxy in enumerate(proxies[:max_attempts]):
        logger.info("Trying proxy %d/%d: %s", i + 1, max_attempts, proxy)

        proxy_cmd = list(original_cmd)
        # Remove the URL (last element) and add proxy args + URL
        proxy_cmd = [c for c in proxy_cmd if c != url]
        proxy_cmd.extend([
            "--proxy", f"socks5://{proxy}",
            url,
        ])

        try:
            result = subprocess.run(
                proxy_cmd,
                capture_output=True, text=True, timeout=120, env=env
            )
            if result.returncode == 0:
                # Success! Find the downloaded file
                import glob as glob_mod
                files = sorted(
                    glob_mod.glob(os.path.join(output_dir, "*")),
                    key=os.path.getmtime, reverse=True
                )
                if files:
                    latest = files[0]
                    filename = os.path.basename(latest)
                    file_size = os.path.getsize(latest)
                    if file_size > 0:
                        logger.info("Download succeeded via proxy %s, file: %s (%d bytes)", proxy, filename, file_size)
                        download_url = f"/api/youtube/file/{hashlib.sha256(g.user.get('email', '').encode() if isinstance(g.user, dict) else b'anon').hexdigest()[:16]}/{urllib.parse.quote(filename)}"
                        return jsonify({"download_url": download_url, "filename": filename, "size": file_size, "proxy_used": proxy}), 200
        except subprocess.TimeoutExpired:
            logger.info("Proxy %s timed out", proxy)
            continue
        except Exception as e:
            logger.info("Proxy %s failed: %s", proxy, e)
            continue

    logger.warning("All %d proxies failed", max_attempts)
    return None


@api_bp.route("/youtube/file/<user_hash>/<path:filename>", methods=["GET"])
def youtube_serve_file(user_hash: str, filename: str):
    """Serve a downloaded YouTube file. Only the owning user can access it."""
    user = getattr(g, "user", None)
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    email = user.get("email", "") if isinstance(user, dict) else getattr(user, "email", "")
    expected_hash = hashlib.sha256(email.encode()).hexdigest()[:16]
    if user_hash != expected_hash:
        return jsonify({"error": "Zugriff verweigert / Access denied"}), 403

    safe_name = _safe_filename(filename)
    filepath = os.path.join(DATA_DIR, "youtube", user_hash, safe_name)
    if not os.path.isfile(filepath):
        return jsonify({"error": "Datei nicht gefunden / File not found"}), 404

    return send_file(filepath, as_attachment=True, download_name=safe_name)


@api_bp.route("/ocr/extract", methods=["POST"])
def ocr_extract():
    """Extract text from an uploaded image using OCR.

    Accepts multipart form data with an 'image' file field and optional
    'language' field (default: 'de'). Forwards to Hermes API or uses
    pytesseract if available.
    """
    if "image" not in request.files:
        return jsonify({"error": "Bild-Datei erforderlich / Image file required"}), 400

    image_file = request.files["image"]
    if not image_file.filename:
        return jsonify({"error": "Dateiname fehlt / Missing filename"}), 400

    content_type = image_file.content_type or ""
    if content_type and content_type not in _ALLOWED_IMAGE_TYPES:
        return jsonify({"error": f"Ungültiger Dateityp: {content_type}. Erlaubt: PNG, JPEG, TIFF, BMP, WebP / Invalid file type"}), 400

    image_data = image_file.read()
    if len(image_data) > _MAX_IMAGE_SIZE:
        return jsonify({"error": "Datei zu groß (max 20 MB) / File too large (max 20 MB)"}), 400

    language = request.form.get("language", "de")

    # Try pytesseract first (local OCR)
    try:
        import pytesseract
        from PIL import Image
        import io

        img = Image.open(io.BytesIO(image_data))
        # Map language codes
        lang_map = {"de": "deu", "en": "eng", "fr": "fra", "es": "spa", "it": "ita"}
        tess_lang = lang_map.get(language, language)
        text = pytesseract.image_to_string(img, lang=tess_lang)
        return jsonify({"text": text.strip(), "engine": "tesseract"})
    except ImportError:
        pass  # pytesseract not available, try Hermes API
    except Exception as e:
        logger.warning("Tesseract OCR failed: %s", e)
        # Fall through to Hermes API

    # Fallback: Forward to Hermes API OCR endpoint
    config = _read_config()
    hermes_url = config.get("hermes_api_url", "")

    if not hermes_url:
        return jsonify({
            "error": "OCR nicht verfügbar. Weder pytesseract noch hermes_api_url konfiguriert. / OCR not available. Neither pytesseract nor hermes_api_url configured.",
            "config_required": "pytesseract or hermes_api_url",
        }), 409

    import urllib.request
    import urllib.error

    try:
        safe_name = _safe_filename(image_file.filename)
        boundary = "----HermesBoundary" + hashlib.md5(os.urandom(16)).hexdigest()
        body_parts = []
        body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{safe_name}\"\r\nContent-Type: {content_type or 'image/png'}\r\n\r\n".encode())
        body_parts.append(image_data)
        body_parts.append(f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\n{language}\r\n--{boundary}--\r\n".encode())
        body_bytes = b"".join(body_parts)

        req = urllib.request.Request(
            f"{hermes_url}/api/v1/ocr/extract",
            data=body_bytes,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
        return jsonify(resp_data)
    except Exception as e:
        logger.warning("OCR via Hermes API failed: %s", type(e).__name__)
        return jsonify({
            "error": f"OCR-Dienst nicht erreichbar ({type(e).__name__}). / OCR service unreachable.",
        }), 502


@api_bp.route("/ocr/extract-url", methods=["POST"])
def ocr_extract_url():
    """Extract text from an image at a given URL.

    Accepts JSON: { url, language }
    Downloads the image, runs OCR (pytesseract or Hermes API).
    """
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()
    language = body.get("language", "de")

    if not url:
        return jsonify({"error": "Bild-URL erforderlich / Image URL required"}), 400

    # Validate URL format
    if not re.match(r"^https?://[^\s]+$", url, re.IGNORECASE):
        return jsonify({"error": "Ungültige URL / Invalid URL"}), 400

    # Download the image
    import urllib.request
    import urllib.error

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "OrganAIzer/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            content_type = resp.headers.get("Content-Type", "")
            image_data = resp.read()

        if len(image_data) > _MAX_IMAGE_SIZE:
            return jsonify({"error": "Datei zu groß (max 20 MB) / File too large (max 20 MB)"}), 400

        # Verify it's an image
        if content_type and content_type not in _ALLOWED_IMAGE_TYPES:
            # Try to detect from content
            try:
                from PIL import Image
                import io
                img = Image.open(io.BytesIO(image_data))
                # If it opens, it's a valid image — proceed
            except Exception:
                return jsonify({"error": f"URL liefert kein gültiges Bild (Content-Type: {content_type}). / URL does not return a valid image."}), 400

        # Map language codes
        lang_map = {"de": "deu", "en": "eng", "fr": "fra", "es": "spa", "it": "ita"}
        tess_lang = lang_map.get(language, language)

        # Try pytesseract (local OCR)
        try:
            import pytesseract
            from PIL import Image
            import io

            img = Image.open(io.BytesIO(image_data))
            text = pytesseract.image_to_string(img, lang=tess_lang)
            return jsonify({"text": text.strip(), "engine": "tesseract"})
        except ImportError:
            pass
        except Exception as e:
            logger.warning("Tesseract OCR (URL) failed: %s", e)

        # Fallback: Hermes API
        config = _read_config()
        hermes_url = config.get("hermes_api_url", "")

        if not hermes_url:
            return jsonify({
                "error": "OCR nicht verfügbar. / OCR not available.",
                "config_required": "pytesseract or hermes_api_url",
            }), 409

        try:
            safe_name = _safe_filename(url.split("/")[-1] or "image")
            boundary = "----HermesBoundary" + hashlib.md5(os.urandom(16)).hexdigest()
            body_parts = []
            body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{safe_name}\"\r\nContent-Type: {content_type or 'image/png'}\r\n\r\n".encode())
            body_parts.append(image_data)
            body_parts.append(f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\n{language}\r\n--{boundary}--\r\n".encode())
            body_bytes = b"".join(body_parts)

            req = urllib.request.Request(
                f"{hermes_url}/api/v1/ocr/extract",
                data=body_bytes,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
            return jsonify(resp_data)
        except Exception as e:
            logger.warning("OCR via Hermes API (URL) failed: %s", type(e).__name__)
            return jsonify({"error": f"OCR-Dienst nicht erreichbar. / OCR service unreachable."}), 502

    except urllib.error.URLError as e:
        return jsonify({"error": f"Bild konnte nicht geladen werden: {e.reason} / Could not load image"}), 502
    except Exception as e:
        logger.warning("OCR URL error: %s", type(e).__name__)
        return jsonify({"error": f"Fehler: {type(e).__name__} / Error"}), 500


@api_bp.route("/hermes/execute", methods=["POST"])
def hermes_execute():
    """Forward a task prompt to the Hermes API for execution."""
    body = request.get_json(silent=True) or {}
    prompt = (body.get("prompt") or "").strip()

    if not prompt:
        return jsonify({"error": "Prompt ist erforderlich / Prompt is required"}), 400
    if len(prompt) > 50000:
        return jsonify({"error": "Prompt zu lang (max 50.000 Zeichen) / Prompt too long"}), 400

    config = _read_config()
    hermes_url = config.get("hermes_api_url", "")

    if not hermes_url:
        return jsonify({
            "error": "Hermes API nicht konfiguriert. Bitte hermes_api_url in den Einstellungen setzen. / Hermes API not configured.",
            "config_required": "hermes_api_url",
        }), 409

    import urllib.request
    import urllib.error

    try:
        req_data = json.dumps({"prompt": prompt}).encode("utf-8")
        req = urllib.request.Request(
            f"{hermes_url}/api/v1/execute",
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
        return jsonify(resp_data)
    except Exception as e:
        logger.warning("Hermes execute failed: %s", type(e).__name__)
        return jsonify({
            "error": f"Hermes API nicht erreichbar ({type(e).__name__}). / Hermes API unreachable.",
        }), 502


@api_bp.route("/hermes/improve-prompt", methods=["POST"])
def hermes_improve_prompt():
    """Improve a text prompt using Hermes API."""
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Text ist erforderlich"}), 400

    config = _read_config()
    hermes_url = config.get("hermes_api_url", "")
    if not hermes_url:
        # Local fallback: just add quality boosters
        return jsonify({"improved": f"{text}, highly detailed, professional quality, masterful composition"})

    import urllib.request
    try:
        prompt = f"Verbessere folgenden Bild-Prompt für bessere KI-Bildgenerierung. Gib nur den verbesserten Prompt zurück, keine Erklärung: {text}"
        req_data = json.dumps({"prompt": prompt}).encode("utf-8")
        req = urllib.request.Request(
            f"{hermes_url}/api/v1/execute",
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
        improved = resp_data.get("result") or resp_data.get("response") or text
        return jsonify({"improved": improved})
    except Exception as e:
        logger.warning("Hermes improve-prompt failed: %s", type(e).__name__)
        return jsonify({"improved": f"{text}, highly detailed, professional quality, masterful composition"})


# ===== Task History =====

def _ensure_task_history_table(db: SQLiteAdapter) -> None:
    """Create task_history table if it does not exist."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS task_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            name TEXT NOT NULL,
            date TEXT NOT NULL DEFAULT (datetime('now')),
            status TEXT NOT NULL DEFAULT 'ok',
            result TEXT
        )
    """)


@api_bp.route("/tasks/history", methods=["GET"])
def get_task_history():
    """Return task history for the authenticated user."""
    user = getattr(g, "user", None)
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    email = user.get("email", "") if isinstance(user, dict) else getattr(user, "email", "")

    db = get_db()
    try:
        _ensure_task_history_table(db)
        rows = db.fetchall(
            "SELECT id, user_email, name, date, status, result FROM task_history WHERE user_email = ? ORDER BY id DESC LIMIT 200",
            (email,),
        )
        return jsonify([dict(r) for r in rows])
    finally:
        db.disconnect()


@api_bp.route("/tasks/history", methods=["POST"])
def add_task_history():
    """Add a task history entry for the authenticated user."""
    user = getattr(g, "user", None)
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    email = user.get("email", "") if isinstance(user, dict) else getattr(user, "email", "")

    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    status = (body.get("status") or "ok").strip()
    result = body.get("result")

    if not name:
        return jsonify({"error": "Name ist erforderlich / Name is required"}), 400

    db = get_db()
    try:
        _ensure_task_history_table(db)
        db.execute(
            "INSERT INTO task_history (user_email, name, date, status, result) VALUES (?, ?, datetime('now'), ?, ?)",
            (email, name, status, result),
        )
        row = db.fetchone("SELECT * FROM task_history ORDER BY id DESC LIMIT 1")
        return jsonify(dict(row)), 201
    finally:
        db.disconnect()


# ===== Bilder Generate =====

@api_bp.route("/bilder/generate", methods=["POST"])
def bilder_generate():
    """Generate images using Hermes API or FAL.ai.

    Body: { prompt, negative_prompt, style, width, height, count, quality }
    Returns: { image_urls: [...], prompt }
    """
    body = request.get_json(silent=True) or {}
    prompt = (body.get("prompt") or "").strip()
    negative_prompt = (body.get("negative_prompt") or "").strip()
    style = (body.get("style") or "realistic").strip()
    width = int(body.get("width") or 1024)
    height = int(body.get("height") or 1024)
    count = min(int(body.get("count") or 1), 4)
    quality = (body.get("quality") or "hd").strip()

    if not prompt:
        return jsonify({"error": "Prompt ist erforderlich / Prompt is required"}), 400

    config = _read_config()
    hermes_url = config.get("hermes_api_url", "")

    # Check for FAL_AI_API_KEY in environment
    fal_api_key = os.environ.get("FAL_AI_API_KEY", "")

    if fal_api_key:
        # Try FAL.ai
        import urllib.request
        import urllib.error
        try:
            full_prompt = f"{prompt}, style: {style}" + (f", negative: {negative_prompt}" if negative_prompt else "")
            payload = json.dumps({
                "prompt": full_prompt,
                "image_size": {"width": width, "height": height},
                "num_images": count,
                "enable_safety_checker": True,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://fal.run/fal-ai/flux/schnell",
                data=payload,
                headers={"Content-Type": "application/json", "Authorization": f"Key {fal_api_key}"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                fal_data = json.loads(resp.read().decode("utf-8"))
            image_urls = [img["url"] for img in fal_data.get("images", [])]
            return jsonify({"image_urls": image_urls, "prompt": prompt})
        except Exception as e:
            logger.warning("FAL.ai image generation failed: %s", type(e).__name__)

    if hermes_url:
        # Try Hermes API image generation endpoint
        import urllib.request
        import urllib.error
        try:
            full_prompt = f"{prompt}, style: {style}" + (f", avoid: {negative_prompt}" if negative_prompt else "")
            req_data = json.dumps({
                "prompt": full_prompt,
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
                "num_images": count,
                "quality": quality,
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{hermes_url}/api/v1/images/generate",
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
            image_urls = resp_data.get("image_urls") or resp_data.get("images") or []
            if image_urls:
                return jsonify({"image_urls": image_urls, "prompt": prompt})
        except Exception as e:
            logger.warning("Hermes image generation failed: %s", type(e).__name__)

    # Fallback: use Hermes execute endpoint
    if hermes_url:
        import urllib.request
        try:
            exec_prompt = f"Generiere {count} Bild{'er' if count > 1 else ''} mit folgendem Prompt: {prompt}. Stil: {style}. Qualität: {quality}."
            req_data = json.dumps({"prompt": exec_prompt}).encode("utf-8")
            req = urllib.request.Request(
                f"{hermes_url}/api/v1/execute",
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
            image_urls = resp_data.get("image_urls") or []
            if image_urls:
                return jsonify({"image_urls": image_urls, "prompt": prompt})
        except Exception as e:
            logger.warning("Hermes execute fallback for images failed: %s", type(e).__name__)

    # Final fallback: Pollinations.ai (free, no API key required)
    try:
        import urllib.request
        import urllib.parse as url_parse
        import random

        style_suffix = {
            "realistic": "photorealistic, high detail",
            "digital-art": "digital art, vibrant",
            "anime": "anime style",
            "3d-render": "3D render, octane",
            "oil-painting": "oil painting",
            "watercolor": "watercolor painting",
            "pixel-art": "pixel art, 8-bit",
            "minimalist": "minimalist, clean",
        }.get(style, style)

        full_prompt = f"{prompt}, {style_suffix}"
        if negative_prompt:
            full_prompt += f", avoid: {negative_prompt}"

        image_urls = []
        for i in range(count):
            seed = random.randint(1, 999999)
            encoded_prompt = url_parse.quote(full_prompt)
            img_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"
            image_urls.append(img_url)

        if image_urls:
            logger.info("Image generated via Pollinations.ai for prompt: %s", prompt[:50])
            return jsonify({"image_urls": image_urls, "prompt": prompt})
    except Exception as e:
        logger.warning("Pollinations.ai image generation failed: %s", type(e).__name__)

    return jsonify({
        "error": "Bildgenerierung nicht verfügbar. / Image generation not available.",
        "config_required": "FAL_AI_API_KEY or hermes_api_url",
    }), 409
