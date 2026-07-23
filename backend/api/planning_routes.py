"""REST API routes for Planning (Regeln, Planungsaufträge, KI-Provider)."""

import json
import logging
import os
import tempfile
import threading

from flask import Blueprint, after_this_request, jsonify, request, send_file

from backend import auth
from backend.db.factory import get_database
from backend.db.interface import DatabaseInterface
from backend.services.openrouter_service import DEFAULT_MODEL, OpenRouterError, chat_json, list_models

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
        rows = db.fetchall("SELECT * FROM planungsregeln ORDER BY id")
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
        if not bez:
            next_row = db.fetchone("SELECT COALESCE(MAX(id), 0) + 1 AS nummer FROM planungsregeln")
            bez = f"Regel {next_row['nummer']}"
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

@planning_bp.route("/models", methods=["GET"])
def openrouter_models():
    try:
        return jsonify({"models": list_models(), "default": DEFAULT_MODEL})
    except OpenRouterError as exc:
        return jsonify({"error": str(exc)}), 502


@planning_bp.route("/validate", methods=["POST"])
def validate_planning():
    body = request.get_json(silent=True) or {}
    rule_ids = body.get("regel_ids", [])
    model = (body.get("model") or DEFAULT_MODEL).strip()
    db = _get_db()
    try:
        context = _planning_context(db, body.get("woche_von", 1), body.get("woche_bis", 53), rule_ids)
        result = chat_json(
            model,
            "Du bist ein strenger Terminplanungs-Prüfer. Antworte ausschließlich als JSON.",
            _validation_prompt(context),
            timeout=180,
        )
        issues = result.get("issues", [])
        if not isinstance(issues, list):
            issues = []
        return jsonify({
            "valid": bool(result.get("valid", not issues)),
            "summary": str(result.get("summary", "")),
            "issues": issues,
            "model": model,
        })
    except OpenRouterError as exc:
        return jsonify({"error": str(exc)}), 502
    finally:
        db.disconnect()

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
    model = (body.get("model") or DEFAULT_MODEL).strip()

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
            db.execute(
                "UPDATE planungsauftraege SET status = 'laeuft', aktualisiert_am = datetime('now') WHERE id = ?",
                (aid,),
            )
            threading.Thread(
                target=_run_ai_job,
                args=(aid, model),
                name=f"planning-job-{aid}",
                daemon=True,
            ).start()
            auftrag["status"] = "laeuft"
            return jsonify(auftrag), 202

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

        body = request.get_json(silent=True) or {}
        model = (body.get("model") or DEFAULT_MODEL).strip()
        db.execute(
            "UPDATE planungsauftraege SET status = 'laeuft', ergebnis_json = NULL, aktualisiert_am = datetime('now') WHERE id = ?",
            (aid,),
        )
        threading.Thread(
            target=_run_ai_job,
            args=(aid, model),
            name=f"planning-job-{aid}",
            daemon=True,
        ).start()
        auftrag["status"] = "laeuft"
        auftrag["ergebnis_json"] = None
        return jsonify(auftrag), 202
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


@planning_bp.route("/auftraege/<int:aid>/excel", methods=["GET"])
def download_auftrag_excel(aid: int):
    db = _get_db()
    path = ""
    try:
        auftrag = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        if not auftrag or not auftrag.get("ergebnis_json"):
            return jsonify({"error": "Kein Planungsergebnis vorhanden"}), 404
        result = json.loads(auftrag["ergebnis_json"])
        if not result.get("vorschlaege"):
            return jsonify({"error": "Keine Terminvorschläge vorhanden"}), 409
        from backend.services.export_service import export_planning_excel
        handle, path = tempfile.mkstemp(suffix=".xlsx")
        os.close(handle)
        export_planning_excel(db, path, result["vorschlaege"], auftrag["woche_von"], auftrag["woche_bis"])

        @after_this_request
        def cleanup(response):
            try:
                os.unlink(path)
            except OSError:
                pass
            return response

        return send_file(
            path,
            as_attachment=True,
            download_name=f"planung_kw_{auftrag['woche_von']}-{auftrag['woche_bis']}.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    finally:
        db.disconnect()


def _run_ai_planning(db: DatabaseInterface, auftrag: dict, regel_ids: list, model: str) -> dict:
    """Run structured planning through OpenRouter."""
    aid = auftrag["id"]
    progress = {
        "provider_status": "running",
        "model": model,
        "phase": "Planungsdaten und ausgewählte Regeln werden vorbereitet.",
        "progress_messages": [
            "Planungsauftrag angelegt",
            "Regeln und bestehende Termine werden geladen",
        ],
        "vorschlaege": [],
        "konflikte": [],
    }
    db.execute(
        "UPDATE planungsauftraege SET ergebnis_json = ?, aktualisiert_am = datetime('now') WHERE id = ?",
        (json.dumps(progress, ensure_ascii=False), aid),
    )
    context = _planning_context(db, auftrag["woche_von"], auftrag["woche_bis"], regel_ids)
    progress.update({
        "phase": f"OpenRouter verarbeitet die Planung mit {model}.",
        "progress_messages": [
            "Planungsauftrag angelegt",
            f"{len(context['rules'])} Regeln und {len(context['existing'])} bestehende Termine geladen",
            "Anfrage an das gewählte KI-Modell übergeben",
        ],
        "bestehende_termine": len(context["existing"]),
        "regeln_geladen": len(context["rules"]),
    })
    db.execute(
        "UPDATE planungsauftraege SET ergebnis_json = ?, aktualisiert_am = datetime('now') WHERE id = ?",
        (json.dumps(progress, ensure_ascii=False), aid),
    )
    try:
        ai_result = chat_json(
            model,
            "Du bist ein professioneller Terminplaner. Erzeuge ausschließlich valides JSON.",
            _planning_prompt(context),
            timeout=300,
        )
        proposals = ai_result.get("proposals", ai_result.get("vorschlaege", []))
        conflicts = ai_result.get("issues", ai_result.get("konflikte", []))
        if not isinstance(proposals, list):
            proposals = []
        if not isinstance(conflicts, list):
            conflicts = []
        ergebnis = {
            "provider_status": "connected",
            "model": model,
            "summary": ai_result.get("summary", ""),
            "vorschlaege": proposals,
            "konflikte": conflicts,
            "bestehende_termine": len(context["existing"]),
            "regeln_geladen": len(context["rules"]),
            "excel_ready": bool(proposals),
        }
        db.execute(
            "UPDATE planungsauftraege SET status = 'vorschlag', ergebnis_json = ?, aktualisiert_am = datetime('now') WHERE id = ?",
            (json.dumps(ergebnis, ensure_ascii=False), aid),
        )
        updated = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        updated["ergebnis"] = ergebnis
        return updated

    except OpenRouterError as exc:
        logger.warning("AI planning failed: %s", exc)
        error_result = {
            "error": str(exc),
            "provider_status": "unreachable",
            "hinweis": "Bitte OpenRouter-Konfiguration und Modell prüfen.",
            "vorschlaege": [],
            "konflikte": [],
            "bestehende_termine": len(context["existing"]),
            "regeln_geladen": len(context["rules"]),
        }
        db.execute(
            "UPDATE planungsauftraege SET status = 'fehler_provider', ergebnis_json = ?, aktualisiert_am = datetime('now') WHERE id = ?",
            (json.dumps(error_result, ensure_ascii=False), aid),
        )
        updated = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        updated["ergebnis"] = error_result
        return updated


def _run_ai_job(aid: int, model: str) -> None:
    """Execute a potentially long OpenRouter request outside the HTTP request."""
    db = _get_db()
    try:
        auftrag = db.fetchone("SELECT * FROM planungsauftraege WHERE id = ?", (aid,))
        if not auftrag:
            return
        rows = db.fetchall(
            "SELECT regel_id FROM planungsauftrag_regeln WHERE auftrag_id = ? ORDER BY regel_id",
            (aid,),
        )
        _run_ai_planning(db, auftrag, [row["regel_id"] for row in rows], model)
    except Exception as exc:
        logger.exception("Background planning job %s failed", aid)
        result = {
            "error": f"Planung fehlgeschlagen ({type(exc).__name__})",
            "provider_status": "error",
            "hinweis": "Der Hintergrundauftrag konnte nicht abgeschlossen werden.",
            "vorschlaege": [],
            "konflikte": [],
            "bestehende_termine": 0,
            "regeln_geladen": 0,
        }
        db.execute(
            "UPDATE planungsauftraege SET status = 'fehler_provider', ergebnis_json = ?, "
            "aktualisiert_am = datetime('now') WHERE id = ?",
            (json.dumps(result, ensure_ascii=False), aid),
        )
    finally:
        db.disconnect()


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


def _planning_context(db: DatabaseInterface, week_from: int, week_to: int, rule_ids: list) -> dict:
    rules = []
    for rule_id in rule_ids:
        rule = db.fetchone("SELECT * FROM planungsregeln WHERE id = ?", (rule_id,))
        if rule:
            rules.append(rule)
    meetings = db.fetchall(
        "SELECT bespr_nr, bezeichnung, intervall, dauer_min FROM termine ORDER BY bespr_nr"
    )
    for meeting in meetings:
        meeting["teilnehmer"] = [
            row["usergruppe"] for row in db.fetchall(
                "SELECT usergruppe FROM termin_teilnehmer WHERE bespr_nr = ? ORDER BY usergruppe",
                (meeting["bespr_nr"],),
            )
        ]
    existing = db.fetchall(
        "SELECT tl.woche, tl.tag, tl.start, tl.meeting AS bespr_nr, "
        "t.bezeichnung, t.dauer_min FROM terminliste tl "
        "JOIN termine t ON tl.meeting = t.bespr_nr "
        "WHERE tl.woche BETWEEN ? AND ? ORDER BY tl.woche, tl.tag, tl.start",
        (week_from, week_to),
    )
    return {
        "week_from": week_from,
        "week_to": week_to,
        "rules": rules,
        "meetings": meetings,
        "existing": existing,
    }


def _validation_prompt(context: dict) -> str:
    return (
        "Prüfe vor einer Planung, ob Regeln, Meetingdefinitionen, Intervalle, Dauern, "
        "Teilnehmer und bestehende Vorgaben logisch erfüllbar sind. Melde Widersprüche, "
        "Unklarheiten, fehlende Angaben und wahrscheinlich nicht erfüllbare Kombinationen. "
        "Antworte als JSON: {\"valid\": boolean, \"summary\": string, "
        "\"issues\":[{\"severity\":\"error|warning|info\",\"title\":string,"
        "\"description\":string,\"related_rules\":[number],\"related_meetings\":[number]}]}.\n\n"
        f"EINGABEDATEN:\n{json.dumps(context, ensure_ascii=False)}"
    )


def _planning_prompt(context: dict) -> str:
    return (
        "Erstelle für alle übergebenen Meetings einen möglichst vollständigen, konfliktfreien "
        "Terminplan im Wochenbereich. Halte Regeln nach Priorität ein. Wenn etwas nicht erfüllbar "
        "oder unklar ist, plane nicht stillschweigend darüber hinweg, sondern melde es als Issue. "
        "Wochentage müssen Mon, Tue, Wed, Thu oder Fri sein; Startzeiten HH:MM. "
        "Antworte als JSON: {\"summary\":string,\"proposals\":[{\"woche\":number,"
        "\"tag\":\"Mon|Tue|Wed|Thu|Fri\",\"start\":\"HH:MM\",\"bespr_nr\":number}],"
        "\"issues\":[{\"severity\":\"error|warning|info\",\"title\":string,"
        "\"description\":string,\"related_rules\":[number],\"related_meetings\":[number]}]}.\n\n"
        f"EINGABEDATEN:\n{json.dumps(context, ensure_ascii=False)}"
    )
