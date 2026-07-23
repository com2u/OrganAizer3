"""Application entry point: the LiveKit agent worker.

Startup flow:
1. The worker registers with LiveKit and waits for jobs.
2. When a caller joins a room (via Twilio SIP telephony *or* the web frontend),
   the worker is dispatched and :func:`entrypoint` runs.
3. The caller is identified against the phonebook, a realtime AI session is
   created, the caller is greeted (personalised if known), and a natural spoken
   conversation follows until the call ends gracefully.

Run with:  python -m app.agent dev   (or  console / start)
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from livekit import api
from livekit.agents import JobContext, WorkerOptions, cli

from . import call_log
from .assistant import VoiceAssistant, build_session
from .config import config
from .instructions import build_greeting_instructions
from .knowledge import load_knowledge_from_config
from .logging_config import get_logger
from .phonebook import Contact, Phonebook
from .tools import summarize_conversation

logger = get_logger("agent")

# One phonebook instance shared across all calls handled by this worker.
phonebook = Phonebook(config.phonebook_path, config.phonebook_seed_path)

# Knowledge base loaded once at startup and injected into every conversation.
knowledge = load_knowledge_from_config(config)


def _caller_number(ctx: JobContext) -> Optional[str]:
    """Extract the caller's phone number from the SIP participant, if any."""
    for participant in ctx.room.remote_participants.values():
        attrs = participant.attributes or {}
        number = attrs.get("sip.phoneNumber")
        if number:
            return number
    return None


def _resolve_call_entry(ctx: JobContext, number: Optional[str],
                        contact: Optional[Contact]) -> tuple[Optional[int], bool]:
    """Return ``(call_id, owns_entry)`` for the *Telefonate* call log.

    - Outbound rooms are named ``out-<callId>-<hex>`` by the control plane, which
      already created the log entry: we attach to it (``owns_entry=False``).
    - Web dialog sessions and inbound phone calls get a fresh entry created here.
    """
    room_name = ctx.room.name or ""
    match = re.match(r"^out-(\d+)-", room_name)
    if match:
        return int(match.group(1)), False

    if room_name == config.server.web_room_name:
        return call_log.create_call("inbound", "Web-Dialog"), True

    label = number or "Unbekannt"
    if contact and contact.get("name"):
        label = f"{number or ''} ({contact.get('name')})".strip()
    return call_log.create_call("inbound", label), True


async def entrypoint(ctx: JobContext) -> None:
    """Handle a single incoming call or web voice session."""
    logger.info("Job received for room '%s'.", ctx.room.name)

    call_id: Optional[int] = None
    transcript: list[str] = []
    call_started_at = datetime.now().astimezone()
    number: Optional[str] = None
    finalized = False

    async def _finalize(fallback_summary: str = "") -> None:
        """On hang-up: summarise and persist the call exactly once."""
        nonlocal finalized
        if finalized or call_id is None:
            return
        finalized = True

        summary = (
            await summarize_conversation("\n".join(transcript), config)
        ) or fallback_summary
        if summary:
            call_log.add_dialog(call_id, "system", summary, status="summary")
        call_log.end_call(call_id, summary=summary or None)
        if number:
            phonebook.record_call(number, summary)
        logger.info("Call %s finalised (%d turns).", call_id, len(transcript))

    try:
        await ctx.connect()

        # Wait briefly for the caller so we can read their phone number.
        try:
            await ctx.wait_for_participant()
        except Exception:  # noqa: BLE001 - web sessions may differ; continue anyway
            pass

        number = _caller_number(ctx)
        contact: Optional[Contact] = phonebook.find(number) if number else None
        if contact:
            logger.info("Identified caller %s as '%s'.", number, contact.get("name"))
        elif number:
            logger.info("Unknown caller %s (not in phonebook).", number)
        else:
            logger.info("Web voice session (no phone number).")

        call_id, owns_entry = _resolve_call_entry(ctx, number, contact)

        session = build_session(config)

        # Record the spoken conversation into the call log so it is visible in
        # the Telefonie -> Telefonate tab (Gesprächsnotizen).
        def _on_item(ev) -> None:  # noqa: ANN001 - livekit event object
            try:
                item = getattr(ev, "item", None)
                if item is None:
                    return
                role = getattr(item, "role", "") or ""
                text = (getattr(item, "text_content", None) or "").strip()
                if not text or role not in ("user", "assistant"):
                    return
                transcript.append(f"{role}: {text}")
                call_log.add_dialog(call_id, role, text)
            except Exception:  # noqa: BLE001 - logging must never break the call
                logger.exception("Failed to record conversation item.")

        session.on("conversation_item_added", _on_item)

        ctx.add_shutdown_callback(_finalize)

        await session.start(
            agent=VoiceAssistant(
                config,
                phonebook=phonebook,
                contact=contact,
                caller_number=number,
                knowledge=knowledge,
                call_started_at=call_started_at,
            ),
            room=ctx.room,
        )
        logger.info("Realtime session started for room '%s'.", ctx.room.name)

        # Greet the caller (personalised if known, standard greeting otherwise).
        await session.generate_reply(
            instructions=build_greeting_instructions(config.assistant, contact)
        )
    except Exception:  # noqa: BLE001 - keep the worker alive on any failure
        # If the AI service cannot be reached (or anything else fails), tear the
        # call down cleanly instead of crashing the whole application.
        logger.exception("Realtime session failed; terminating call cleanly.")
        if call_id is not None:
            await _finalize("Anruf abgebrochen (technischer Fehler).")
        try:
            await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
        except Exception:  # noqa: BLE001 - best-effort cleanup
            logger.exception("Failed to clean up room after error.")


def main() -> None:
    logger.info("Starting OrganAIzer voice assistant worker...")
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            # Dedicated localhost health port to avoid colliding with the other
            # host-networked LiveKit services (which already use 8081).
            host=config.agent_http_host,
            port=config.agent_http_port,
        )
    )


if __name__ == "__main__":
    main()
