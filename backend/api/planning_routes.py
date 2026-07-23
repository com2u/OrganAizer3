"""REST API routes for Planning (Regeln, Planungsaufträge, KI-Provider)."""

import json
import logging

from flask import Blueprint, jsonify, request

from backend import auth
from backend.db.factory import get_database
from backend.db.interface import DatabaseInterface

logger = logging.getLogger(__name__)

planning_bp = Blueprint("planning", __name__)


@planning_bp.before_request
def _enforce_auth():
    return auth.enforce_auth()


def _get_db() -> DatabaseInterface:
    db = get_database()
    db.connect()
    return db


def _read_config() -> dict:
    """Read app config for hermes_api_url."""
    import os
    from backend.config import CONFIG_PATH
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            stored = json.load(f)
        return stored if isinstance(stored, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


# ===== Planungsregeln =====

@planning_bp.route("/regeln", methods=["GET"])
def list_regeln():
    db = _get_db()
    try:
        rows = db.fetchall("SELECT * FROM planungsregeln ORDER BY prioritaet, bezeichnung")
        return jsonify(rows)
    finally:
        db.disconnect()


@planning_bp.route("/regeln/<int:rid>", methods=["GET"])
def get_regel(rid: int):
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM planungsregeln WHERE id = ?", (rid,))
        if not row:
            return jsonify({"error": "Regel nicht gefunden"}), 404
        return jsonify(row)
    finally:
        db.disconnect()


_RULE_TYPES = {"constraint", "preference", "exclusion", "requirement"}


@planning_bp.route("/regeln", methods=["POST"])
def create_regel():
    body = request.get_json(silent=True) or {}
    bez = (body.get("bezeichnung") or "").strip()
    bedingung = (body.get("bedingung") or "").strip()
    if not bez:
        return jsonify({"error": "Bezeichnung ist erforderlich"}), 400
    if not bedingung:
        return jsonify({"error": "Bedingung ist erforderlich"}), 400
    typ = body.get("typ", "constraint")
    if typ not in _RULE_TYPES:
        return jsonify({"error": f"Typ muss einer von {', '.join(sorted(_RULE_TYPES))} sein"}), 400
    prio = body.get("prioritaet", 5)
    if not isinstance(prio, int) or prio < 1 or prio > 10:
        return jsonify({"error": "Priorität muss zwischen 1 und 10 liegen"}), 400
    db = _get_db()
    try:
        db.execute(
            "INSERT INTO planungsregeln (bezeichnung, typ, bedingung, prioritaet, aktiv) VALUES (?, ?, ?, ?, ?)",
            (bez, typ, bedingung, prio, 1 if body.get("aktiv", True) else 0),
        )
        row = db.fetchone("SELECT * FROM planungsregeln ORDER BY id DESC LIMIT 1")
        return jsonify(row), 201
    finally:
        db.disconnect()


@planning_bp.route("/regeln/<int:rid>", methods=["PUT"])
def update_regel(rid: int):
    body = request.get_json(silent=True) or {}
    bez = (body.get("bezeichnung") or "").strip()
    bedingung = (body.get("bedingung") or "").strip()
    if not bez:
        return jsonify({"error": "Bezeichnung ist erforderlich"}), 400
    if not bedingung:
        return jsonify({"error": "Bedingung ist erforderlich"}), 400
    typ = body.get("typ", "constraint")
    if typ not in _RULE_TYPES:
        return jsonify({"error": f"Typ muss einer von {', '.join(sorted(_RULE_TYPES))} sein"}), 400
    prio = body.get("prioritaet", 5)
    if not isinstance(prio, int) or prio < 1 or prio > 10:
        return jsonify({"error": "Priorität muss zwischen 1 und 10 liegen"}), 400
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM planungsregeln WHERE id = ?", (rid,))
        if not existing:
            return jsonify({"error": "Regel nicht gefunden"}), 404
        db.execute(
            "UPDATE planungsregeln SET bezeichnung=?, typ=?, bedingung=?, prioritaet=?, aktiv=?, aktualisiert_am=datetime('now') WHERE id=?",
            (bez, typ, bedingung, prio, 1 if body.get("aktiv", True) else 0, rid),
        )
        return jsonify(db.fetchone("SELECT * FROM planungsregeln WHERE id = ?", (rid,)))
    finally:
        db.disconnect()


@planning_bp.route("/regeln/<int:rid>", methods=["DELETE"])
def delete_regel(rid: int):
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM planungsregeln WHERE id = ?", (rid,))
        if not existing:
            return jsonify({"error": "Regel nicht gefunden"}), 404
        db.execute("DELETE FROM planungsregeln WHERE id = ?", (rid,))
        return jsonify({"status": "ok"})
    finally:
        db.disconnect()


# ===== Planungsaufträge =====

@planning_bp.route("/auftraege", methods=["GET"])
def list_auftraege():
    db = _get_db()
    try:
        rows = db.fetchall("SELECT * FROM planungsauftraege ORDER BY erstellt_am DESC")
        return jsonify(rows)
    finally:
        db.disconnect()


@planning_bp.route("/auftraege/<int:aid>", methods=["GET"])
def get_auftrag(aid: int):
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        if not row:
            return jsonify({"error": "Auftrag nicht gefunden"}), 404
        regeln = db.fetchall(
            "SELECT r.* FROM planungsregeln r JOIN planungsauftrag_regeln pr ON r.id = pr.regel_id WHERE pr.auftrag_id = ?",
            (aid,),
        )
        row["regeln"] = regeln
        # Parse result JSON if present
        if row.get("ergebnis_json"):
            try:
                row["ergebnis"] = json.loads(row["ergebnis_json"])
            except json.JSONDecodeError:
                row["ergebnis"] = None
        return jsonify(row)
    finally:
        db.disconnect()


@planning_bp.route("/auftraege", methods=["POST"])
def create_auftrag():
    """Create a planning job and optionally run AI planning."""
    body = request.get_json(silent=True) or {}
    woche_von = body.get("woche_von")
    woche_bis = body.get("woche_bis")
    if not isinstance(woche_von, int) or not isinstance(woche_bis, int):
        return jsonify({"error": "woche_von und woche_bis sind erforderlich (Integer)"}), 400
    if woche_von > woche_bis:
        return jsonify({"error": "woche_von darf nicht größer als woche_bis sein"}), 400

    regel_ids = body.get("regel_ids", [])
    if not isinstance(regel_ids, list):
        return jsonify({"error": "regel_ids muss eine Liste sein"}), 400

    run_ai = body.get("run_ai", False)

    db = _get_db()
    try:
        db.execute(
            "INSERT INTO planungsauftraege (bezeichnung, woche_von, woche_bis, status) VALUES (?, ?, ?, ?)",
            (body.get("bezeichnung", f"Planung KW {woche_von}-{woche_bis}"), woche_von, woche_bis, "entwurf"),
        )
        auftrag = db.fetchone("SELECT * FROM planungsauftraege ORDER BY id DESC LIMIT 1")
        aid = auftrag["id"]

        # Link rules
        for rid in regel_ids:
            exists = db.fetchone("SELECT id FROM planungsregeln WHERE id = ?", (rid,))
            if exists:
                db.execute(
                    "INSERT OR IGNORE INTO planungsauftrag_regeln (auftrag_id, regel_id) VALUES (?, ?)",
                    (aid, rid),
                )

        if run_ai:
            result = _run_ai_planning(db, auftrag, regel_ids)
            return jsonify(result), 201

        return jsonify(auftrag), 201
    finally:
        db.disconnect()


@planning_bp.route("/auftraege/<int:aid>/run", methods=["POST"])
def run_auftrag(aid: int):
    """Run AI planning for an existing draft order."""
    db = _get_db()
    try:
        auftrag = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        if not auftrag:
            return jsonify({"error": "Auftrag nicht gefunden"}), 404

        regel_ids_rows = db.fetchall(
            "SELECT regel_id FROM planungsauftrag_regeln WHERE auftrag_id = ?", (aid,)
        )
        regel_ids = [r["regel_id"] for r in regel_ids_rows]

        result = _run_ai_planning(db, auftrag, regel_ids)
        return jsonify(result)
    finally:
        db.disconnect()


@planning_bp.route("/auftraege/<int:aid>/apply", methods=["POST"])
def apply_auftrag(aid: int):
    """Apply a confirmed planning result. Requires explicit confirmation."""
    body = request.get_json(silent=True) or {}
    if not body.get("confirm"):
        return jsonify({"error": "Explizite Bestätigung erforderlich. Senden Sie {\"confirm\": true}"}), 400

    db = _get_db()
    try:
        auftrag = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        if not auftrag:
            return jsonify({"error": "Auftrag nicht gefunden"}), 404
        if auftrag["status"] != "vorschlag":
            return jsonify({"error": "Nur Aufträge mit Status 'vorschlag' können angewendet werden"}), 409

        ergebnis = None
        if auftrag.get("ergebnis_json"):
            try:
                ergebnis = json.loads(auftrag["ergebnis_json"])
            except json.JSONDecodeError:
                pass

        if not ergebnis or not ergebnis.get("vorschlaege"):
            return jsonify({"error": "Keine Vorschläge zum Anwenden vorhanden"}), 409

        # Apply proposals to terminliste transactionally
        applied = 0
        for v in ergebnis.get("vorschlaege", []):
            if v.get("typ") == "termin_vorschlag":
                db.execute(
                    "INSERT INTO terminliste (woche, tag, start, meeting) VALUES (?, ?, ?, ?)",
                    (v["woche"], v["tag"], v["start"], v["bespr_nr"]),
                )
                applied += 1

        db.execute(
            "UPDATE planungsauftraege SET status = 'angewendet', aktualisiert_am = datetime('now') WHERE id = ?",
            (aid,),
        )

        return jsonify({"status": "ok", "applied": applied})
    finally:
        db.disconnect()


def _run_ai_planning(db: DatabaseInterface, auftrag: dict, regel_ids: list) -> dict:
    """Run AI-based planning via Hermes provider abstraction.

    If the AI provider is not configured or unreachable, returns an honest
    configuration-dependent error with a fallback suggestion mode.
    """
    config = _read_config()
    hermes_url = config.get("hermes_api_url", "")
    aid = auftrag["id"]

    # Load rules
    regeln = []
    for rid in regel_ids:
        r = db.fetchone("SELECT * FROM planungsregeln WHERE id = ?", (rid,))
        if r:
            regeln.append(r)

    # Load existing appointments for the week range
    termine = db.fetchall(
        "SELECT tl.*, t.bezeichnung, t.dauer_min FROM terminliste tl JOIN termine t ON tl.meeting = t.bespr_nr WHERE tl.woche BETWEEN ? AND ? ORDER BY tl.woche, tl.tag, tl.start",
        (auftrag["woche_von"], auftrag["woche_bis"]),
    )

    if not hermes_url:
        # No AI provider configured - return honest error with suggestion mode
        db.execute(
            "UPDATE planungsauftraege SET status = 'fehler_provider', ergebnis_json = ?, aktualisiert_am = datetime('now') WHERE id = ?",
            (json.dumps({
                "error": "KI-Provider nicht konfiguriert",
                "provider_status": "not_configured",
                "hinweis": "Bitte hermes_api_url in den Einstellungen konfigurieren, um KI-basierte Planung zu nutzen.",
                "vorschlaege": [],
                "konflikte": [],
                "bestehende_termine": len(termine),
                "regeln_geladen": len(regeln),
            }, ensure_ascii=False), aid),
        )
        updated = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        updated["ergebnis"] = json.loads(updated["ergebnis_json"]) if updated.get("ergebnis_json") else None
        return updated

    # Try calling Hermes AI API
    import urllib.request
    import urllib.error

    prompt = _build_planning_prompt(auftrag, regeln, termine)

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

        # Parse AI response into structured proposals
        ai_result = resp_data.get("result", str(resp_data))
        ergebnis = {
            "provider_status": "connected",
            "ai_response": ai_result,
            "vorschlaege": [],
            "konflikte": [],
            "bestehende_termine": len(termine),
            "regeln_geladen": len(regeln),
        }

        db.execute(
            "UPDATE planungsauftraege SET status = 'vorschlag', ergebnis_json = ?, aktualisiert_am = datetime('now') WHERE id = ?",
            (json.dumps(ergebnis, ensure_ascii=False), aid),
        )
        updated = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        updated["ergebnis"] = ergebnis
        return updated

    except Exception as e:
        logger.warning("AI planning failed: %s", type(e).__name__)
        error_result = {
            "error": f"KI-Provider nicht erreichbar ({type(e).__name__})",
            "provider_status": "unreachable",
            "hinweis": "Der KI-Provider konnte nicht erreicht werden. Bitte prüfen Sie die hermes_api_url Konfiguration.",
            "vorschlaege": [],
            "konflikte": [],
            "bestehende_termine": len(termine),
            "regeln_geladen": len(regeln),
        }
        db.execute(
            "UPDATE planungsauftraege SET status = 'fehler_provider', ergebnis_json = ?, aktualisiert_am = datetime('now') WHERE id = ?",
            (json.dumps(error_result, ensure_ascii=False), aid),
        )
        updated = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        updated["ergebnis"] = error_result
        return updated


# ===== Abhängigkeiten =====

_ABHAENGIGKEIT_TYPEN = {"requires", "blocks", "conflicts", "supports"}
_ZIEL_TYPEN = {"regel", "person", "gruppe", "rolle", "raum", "komponente", "termin"}


@planning_bp.route("/abhaengigkeiten", methods=["GET"])
def list_abhaengigkeiten():
    db = _get_db()
    try:
        regel_id = request.args.get("regel_id")
        if regel_id:
            try:
                regel_id = int(regel_id)
            except (ValueError, TypeError):
                return jsonify({"error": "regel_id muss eine Ganzzahl sein"}), 400
            rows = db.fetchall(
                "SELECT * FROM planungsregel_abhaengigkeiten WHERE regel_id = ? ORDER BY id",
                (regel_id,),
            )
        else:
            rows = db.fetchall("SELECT * FROM planungsregel_abhaengigkeiten ORDER BY id")
        return jsonify(rows)
    finally:
        db.disconnect()


@planning_bp.route("/abhaengigkeiten", methods=["POST"])
def create_abhaengigkeit():
    body = request.get_json(silent=True) or {}
    regel_id = body.get("regel_id")
    if not isinstance(regel_id, int) or regel_id < 1:
        return jsonify({"error": "regel_id ist erforderlich (positive Ganzzahl)"}), 400
    typ = body.get("typ", "requires")
    if typ not in _ABHAENGIGKEIT_TYPEN:
        return jsonify({"error": f"typ muss einer von {', '.join(sorted(_ABHAENGIGKEIT_TYPEN))} sein"}), 400
    ziel_typ = body.get("ziel_typ", "")
    if ziel_typ not in _ZIEL_TYPEN:
        return jsonify({"error": f"ziel_typ muss einer von {', '.join(sorted(_ZIEL_TYPEN))} sein"}), 400
    ziel_id = body.get("ziel_id")
    ziel_text = (body.get("ziel_text") or "").strip()
    if ziel_id is not None and (not isinstance(ziel_id, int) or ziel_id < 1):
        return jsonify({"error": "ziel_id muss eine positive Ganzzahl sein"}), 400
    if not ziel_id and not ziel_text:
        return jsonify({"error": "ziel_id oder ziel_text ist erforderlich"}), 400
    bedingung = (body.get("bedingung") or "").strip()

    db = _get_db()
    try:
        # Validate regel exists
        if not db.fetchone("SELECT id FROM planungsregeln WHERE id = ?", (regel_id,)):
            return jsonify({"error": "Regel nicht gefunden"}), 404
        # Validate ziel_id for regel type
        if ziel_typ == "regel" and ziel_id:
            if not db.fetchone("SELECT id FROM planungsregeln WHERE id = ?", (ziel_id,)):
                return jsonify({"error": "Ziel-Regel nicht gefunden"}), 404
        db.execute(
            "INSERT INTO planungsregel_abhaengigkeiten (regel_id, typ, ziel_typ, ziel_id, ziel_text, bedingung, aktiv) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (regel_id, typ, ziel_typ, ziel_id, ziel_text or None, bedingung or None, 1 if body.get("aktiv", True) else 0),
        )
        row = db.fetchone("SELECT * FROM planungsregel_abhaengigkeiten ORDER BY id DESC LIMIT 1")
        return jsonify(row), 201
    finally:
        db.disconnect()


@planning_bp.route("/abhaengigkeiten/<int:aid>", methods=["PUT"])
def update_abhaengigkeit(aid: int):
    body = request.get_json(silent=True) or {}
    db = _get_db()
    try:
        existing = db.fetchone("SELECT * FROM planungsregel_abhaengigkeiten WHERE id = ?", (aid,))
        if not existing:
            return jsonify({"error": "Abhängigkeit nicht gefunden"}), 404
        typ = body.get("typ", existing["typ"])
        if typ not in _ABHAENGIGKEIT_TYPEN:
            return jsonify({"error": f"typ muss einer von {', '.join(sorted(_ABHAENGIGKEIT_TYPEN))} sein"}), 400
        ziel_typ = body.get("ziel_typ", existing["ziel_typ"])
        if ziel_typ not in _ZIEL_TYPEN:
            return jsonify({"error": f"ziel_typ muss einer von {', '.join(sorted(_ZIEL_TYPEN))} sein"}), 400
        ziel_id = body.get("ziel_id", existing["ziel_id"])
        ziel_text = body.get("ziel_text", existing["ziel_text"])
        if ziel_id is not None and (not isinstance(ziel_id, int) or ziel_id < 1):
            return jsonify({"error": "ziel_id muss eine positive Ganzzahl sein"}), 400
        bedingung = body.get("bedingung", existing["bedingung"])
        aktiv = 1 if body.get("aktiv", existing["aktiv"]) else 0
        db.execute(
            "UPDATE planungsregel_abhaengigkeiten SET typ=?, ziel_typ=?, ziel_id=?, ziel_text=?, bedingung=?, aktiv=?, aktualisiert_am=datetime('now') WHERE id=?",
            (typ, ziel_typ, ziel_id, ziel_text, bedingung, aktiv, aid),
        )
        return jsonify(db.fetchone("SELECT * FROM planungsregel_abhaengigkeiten WHERE id = ?", (aid,)))
    finally:
        db.disconnect()


@planning_bp.route("/abhaengigkeiten/<int:aid>", methods=["DELETE"])
def delete_abhaengigkeit(aid: int):
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM planungsregel_abhaengigkeiten WHERE id = ?", (aid,))
        if not existing:
            return jsonify({"error": "Abhängigkeit nicht gefunden"}), 404
        db.execute("DELETE FROM planungsregel_abhaengigkeiten WHERE id = ?", (aid,))
        return jsonify({"status": "ok"})
    finally:
        db.disconnect()


def _build_planning_prompt(auftrag: dict, regeln: list, termine: list) -> str:
    """Build a structured prompt for the AI planning provider."""
    lines = [
        f"Erstelle einen Terminplan für die Kalenderwochen {auftrag['woche_von']} bis {auftrag['woche_bis']}.",
        "",
        "Bestehende Termine:",
    ]
    for t in termine[:50]:  # limit context
        lines.append(f"  KW{t['woche']} {t['tag']} {t['start']}: {t['bezeichnung']} ({t['dauer_min']}min)")

    lines.append("")
    lines.append("Regeln:")
    for r in regeln:
        lines.append(f"  [{r['typ']}] {r['bezeichnung']}: {r['bedingung']} (Prio {r['prioritaet']})")

    lines.append("")
    lines.append("Bitte erstelle Vorschläge im JSON-Format mit Feldern: typ, woche, tag, start, bespr_nr, bezeichnung, dauer_min")
    lines.append("Identifiziere auch mögliche Konflikte.")

    return "\n".join(lines)
