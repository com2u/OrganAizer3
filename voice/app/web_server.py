"""Web + token server for the browser voice client.

Serves the static web frontend and issues short-lived LiveKit access tokens so
the browser can join the same room the agent worker watches. This is the "web
frontend input" transport; the phone (SIP) input needs no server of its own.

Run with:  python -m app.web_server
"""

from __future__ import annotations

import uuid
from pathlib import Path

from aiohttp import web
from livekit import api

from .config import config
from .logging_config import get_logger
from .setup_sip import ensure_outbound_trunk

logger = get_logger("web_server")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


async def handle_token(request: web.Request) -> web.Response:
    """Issue a LiveKit access token for the configured web room."""
    identity = f"web-user-{uuid.uuid4().hex[:8]}"
    room = config.server.web_room_name

    token = (
        api.AccessToken(config.livekit.api_key, config.livekit.api_secret)
        .with_identity(identity)
        .with_name("Web Caller")
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room,
                can_publish=True,
                can_subscribe=True,
            )
        )
        .to_jwt()
    )

    logger.info("Issued web access token for identity '%s' in room '%s'.", identity, room)
    return web.json_response(
        {
            "token": token,
            "url": config.livekit.public_url,
            "room": room,
            "identity": identity,
        }
    )


async def handle_index(request: web.Request) -> web.Response:
    return web.FileResponse(WEB_DIR / "index.html")


async def handle_status(request: web.Request) -> web.Response:
    """Report voice-stack health and configured telephony details."""
    livekit_ok = False
    rooms = 0
    error = ""
    lkapi = api.LiveKitAPI(
        config.livekit.url, config.livekit.api_key, config.livekit.api_secret
    )
    try:
        listing = await lkapi.room.list_rooms(api.ListRoomsRequest())
        rooms = len(listing.rooms)
        livekit_ok = True
    except Exception as exc:  # noqa: BLE001
        error = str(exc)
        logger.warning("LiveKit status check failed: %s", exc)
    finally:
        await lkapi.aclose()

    return web.json_response(
        {
            "livekit_ok": livekit_ok,
            "active_rooms": rooms,
            "phone_number": config.phone_number,
            "inbound_configured": bool(config.phone_number and config.phone_number != "tbd"),
            "outbound_configured": bool(
                config.twilio.outbound_trunk_id or config.twilio.sip_uri
            ),
            "error": error,
        }
    )


async def handle_outbound(request: web.Request) -> web.Response:
    """Place an outbound PSTN call and connect the AI agent.

    Creates a dedicated room, ensures an outbound SIP trunk to Twilio exists,
    then dials the target number into the room. The agent worker is dispatched
    to the new room automatically and handles the conversation.
    """
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001
        body = {}
    number = str(body.get("number", "")).strip()
    if not number:
        return web.json_response({"error": "Rufnummer fehlt."}, status=400)

    # Embed the OrganAIzer call-log id (if provided) in the room name so the
    # agent attaches the transcript/summary to the existing Telefonate entry.
    call_id = body.get("call_id")
    suffix = uuid.uuid4().hex[:8]
    room = f"out-{call_id}-{suffix}" if call_id is not None else f"out-{suffix}"
    lkapi = api.LiveKitAPI(
        config.livekit.url, config.livekit.api_key, config.livekit.api_secret
    )
    try:
        trunk_id = await ensure_outbound_trunk(lkapi)
        await lkapi.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=number,
                room_name=room,
                participant_identity=f"caller-{uuid.uuid4().hex[:6]}",
                participant_name=number,
                wait_until_answered=False,
            )
        )
        logger.info("Outbound call to %s dispatched into room %s.", number, room)
        return web.json_response({"room": room, "number": number, "status": "initiated"})
    except Exception as exc:  # noqa: BLE001
        logger.exception("Outbound call failed.")
        return web.json_response({"error": str(exc)}, status=502)
    finally:
        await lkapi.aclose()


async def handle_hangup(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001
        body = {}
    room = str(body.get("room", "")).strip()
    if not room:
        return web.json_response({"error": "room fehlt."}, status=400)
    lkapi = api.LiveKitAPI(
        config.livekit.url, config.livekit.api_key, config.livekit.api_secret
    )
    try:
        await lkapi.room.delete_room(api.DeleteRoomRequest(room=room))
        return web.json_response({"room": room, "status": "ended"})
    except Exception as exc:  # noqa: BLE001
        return web.json_response({"error": str(exc)}, status=502)
    finally:
        await lkapi.aclose()


async def handle_favicon(request: web.Request) -> web.Response:
    # No favicon; return 204 so browsers stop logging a 404.
    return web.Response(status=204)


def build_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/api/token", handle_token)
    app.router.add_get("/api/status", handle_status)
    app.router.add_post("/api/outbound", handle_outbound)
    app.router.add_post("/api/hangup", handle_hangup)
    app.router.add_get("/favicon.ico", handle_favicon)
    app.router.add_get("/", handle_index)
    app.router.add_static("/", WEB_DIR, show_index=False)
    return app


def main() -> None:
    logger.info(
        "Starting web + token server on http://%s:%s ...",
        config.server.host,
        config.server.port,
    )
    web.run_app(build_app(), host=config.server.host, port=config.server.port)


if __name__ == "__main__":
    main()
