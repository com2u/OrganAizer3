"""Helper to register the Twilio/LiveKit SIP telephony resources.

Creates (idempotently) an inbound SIP trunk for the configured phone number and
a dispatch rule that routes each incoming call into its own room, which the
agent worker then joins automatically.

Run with:  python -m app.setup_sip
"""

from __future__ import annotations

import asyncio

from livekit import api

from .config import config
from .logging_config import get_logger

logger = get_logger("setup_sip")

TRUNK_NAME = "OrganAIzer inbound trunk"
OUTBOUND_TRUNK_NAME = "OrganAIzer outbound trunk"
RULE_NAME = "OrganAIzer inbound calls"
ROOM_PREFIX = "call-"


def _twilio_termination_host() -> str:
    """Best-effort Twilio termination host for outbound calls.

    Derives ``<domain>.pstn.twilio.com`` from the configured SIP URI when
    possible; the value can also be provided verbatim via TWILIO_SIP_URI.
    """
    uri = config.twilio.sip_uri or ""
    host = uri.replace("sip:", "").split("@")[-1].split(":")[0].strip()
    return host


async def ensure_outbound_trunk(lkapi: "api.LiveKitAPI") -> str:
    """Create (idempotently) a LiveKit outbound SIP trunk to Twilio.

    Returns the trunk id. Reuses a configured id or an existing trunk by name.
    """
    if config.twilio.outbound_trunk_id:
        return config.twilio.outbound_trunk_id

    existing = await lkapi.sip.list_sip_outbound_trunk(
        api.ListSIPOutboundTrunkRequest()
    )
    for trunk in existing.items:
        if trunk.name == OUTBOUND_TRUNK_NAME:
            logger.info("Reusing existing outbound trunk: %s", trunk.sip_trunk_id)
            return trunk.sip_trunk_id

    host = _twilio_termination_host()
    if not host:
        raise RuntimeError(
            "No Twilio SIP URI configured for outbound calls (TWILIO_SIP_URI)."
        )

    logger.info("Creating outbound SIP trunk to %s ...", host)
    trunk = await lkapi.sip.create_sip_outbound_trunk(
        api.CreateSIPOutboundTrunkRequest(
            trunk=api.SIPOutboundTrunkInfo(
                name=OUTBOUND_TRUNK_NAME,
                address=host,
                numbers=[config.phone_number] if config.phone_number not in ("", "tbd") else [],
                auth_username=config.twilio.account_sid or "",
                auth_password=config.twilio.auth_token or "",
            )
        )
    )
    logger.info("Created outbound trunk: %s", trunk.sip_trunk_id)
    return trunk.sip_trunk_id


async def _ensure_inbound_trunk(lkapi: api.LiveKitAPI) -> str:
    existing = await lkapi.sip.list_sip_inbound_trunk(
        api.ListSIPInboundTrunkRequest()
    )
    for trunk in existing.items:
        if config.phone_number in trunk.numbers or trunk.name == TRUNK_NAME:
            logger.info("Reusing existing inbound trunk: %s", trunk.sip_trunk_id)
            return trunk.sip_trunk_id

    logger.info("Creating inbound SIP trunk for %s ...", config.phone_number)
    trunk = await lkapi.sip.create_sip_inbound_trunk(
        api.CreateSIPInboundTrunkRequest(
            trunk=api.SIPInboundTrunkInfo(
                name=TRUNK_NAME,
                numbers=[config.phone_number],
            )
        )
    )
    logger.info("Created inbound trunk: %s", trunk.sip_trunk_id)
    return trunk.sip_trunk_id


async def _ensure_dispatch_rule(lkapi: api.LiveKitAPI, trunk_id: str) -> str:
    existing = await lkapi.sip.list_sip_dispatch_rule(
        api.ListSIPDispatchRuleRequest()
    )
    for rule in existing.items:
        if rule.name == RULE_NAME:
            logger.info("Reusing existing dispatch rule: %s", rule.sip_dispatch_rule_id)
            return rule.sip_dispatch_rule_id

    logger.info("Creating dispatch rule (individual rooms, prefix '%s') ...", ROOM_PREFIX)
    rule = await lkapi.sip.create_sip_dispatch_rule(
        api.CreateSIPDispatchRuleRequest(
            name=RULE_NAME,
            trunk_ids=[trunk_id],
            rule=api.SIPDispatchRule(
                dispatch_rule_individual=api.SIPDispatchRuleIndividual(
                    room_prefix=ROOM_PREFIX,
                )
            ),
        )
    )
    logger.info("Created dispatch rule: %s", rule.sip_dispatch_rule_id)
    return rule.sip_dispatch_rule_id


async def _setup() -> None:
    if not config.phone_number or config.phone_number == "tbd":
        raise RuntimeError(
            "PHONE_NUMBER is not configured. Set it in .env before running setup."
        )

    lkapi = api.LiveKitAPI(
        config.livekit.url, config.livekit.api_key, config.livekit.api_secret
    )
    try:
        trunk_id = await _ensure_inbound_trunk(lkapi)
        await _ensure_dispatch_rule(lkapi, trunk_id)
        logger.info("SIP telephony setup complete for %s.", config.phone_number)
    finally:
        await lkapi.aclose()


def main() -> None:
    asyncio.run(_setup())


if __name__ == "__main__":
    main()
