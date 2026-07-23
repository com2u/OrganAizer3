"""The voice assistant agent and its realtime session configuration.

This is the heart of the AI session: it wires the OpenAI Realtime model to the
LiveKit agent runtime and exposes the assistant's behaviour (including graceful
call termination). It is transport-agnostic: the same agent serves both phone
(SIP) and web callers.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from livekit import api
from livekit.agents import Agent, AgentSession, RunContext, function_tool, get_job_context
from livekit.plugins import openai

from .config import Config
from .instructions import build_instructions
from .logging_config import get_logger
from .phonebook import Contact, Phonebook
from .tools import query_hermes, web_search

logger = get_logger("assistant")


class VoiceAssistant(Agent):
    """OrganAIzer voice assistant with graceful hang-up, web research and
    phonebook-aware notes."""

    def __init__(
        self,
        cfg: Config,
        phonebook: Optional[Phonebook] = None,
        contact: Optional[Contact] = None,
        caller_number: Optional[str] = None,
        knowledge: str = "",
        call_started_at: Optional[datetime] = None,
    ) -> None:
        self._cfg = cfg
        self._phonebook = phonebook
        self._contact = contact
        self._caller_number = caller_number
        super().__init__(
            instructions=build_instructions(
                cfg.assistant, contact, knowledge, now=call_started_at
            )
        )

    @function_tool
    async def save_note(self, ctx: RunContext, note: str) -> str:
        """Save an important new fact about the current caller to the phonebook.

        Use this for durable, relevant information learned during the call
        (events, interests, plans, life updates). Keep `note` short and factual,
        in German, one fact per call to this tool. Do not save small talk or
        sensitive data the caller would not want stored.
        """
        if not self._phonebook or not self._caller_number:
            logger.info("save_note skipped (no known caller).")
            return "Ich kann für diesen Anrufer keine Notiz speichern."
        ok = self._phonebook.add_note(self._caller_number, note)
        return "Notiz gespeichert." if ok else "Die Notiz konnte nicht gespeichert werden."

    @function_tool
    async def search_web(self, ctx: RunContext, query: str) -> str:
        """Look something up on the internet.

        Use this whenever the user asks about current events, live data, or any
        fact you are not sure about. Pass a concise search query as `query`.
        Then answer the user in your own words based on the returned text.
        """
        logger.info("Assistant requested web search: %s", query)
        return await web_search(query, self._cfg)

    @function_tool
    async def ask_hermes(self, ctx: RunContext, query: str) -> str:
        """Use Hermes for calendar, appointments, email and personal services.

        Always use this tool when the caller asks about their appointments,
        calendar entries, availability, emails, messages, tasks, reminders or
        similar account-specific information. Pass the complete request,
        including relevant dates, people and requested action. Do not use web
        search for personal data that Hermes can access.
        """
        logger.info("Assistant delegated personal-data request to Hermes.")
        return await query_hermes(query, self._cfg)

    @function_tool
    async def end_call(self, ctx: RunContext) -> None:
        """End and hang up the call.

        Only call this after the user has clearly signalled they are done and
        you have already said goodbye.
        """
        logger.info("Assistant requested graceful call termination.")
        # Let any final goodbye finish playing before tearing the room down.
        current_speech = ctx.session.current_speech
        if current_speech is not None:
            await current_speech.wait_for_playout()

        job_ctx = get_job_context()
        try:
            await job_ctx.api.room.delete_room(
                api.DeleteRoomRequest(room=job_ctx.room.name)
            )
        except Exception:  # noqa: BLE001 - fail gracefully on teardown
            logger.exception("Failed to delete room during call termination.")


def build_session(cfg: Config) -> AgentSession:
    """Create the realtime AgentSession backed by the OpenAI Realtime model."""
    logger.info(
        "Creating realtime session (model=%s, voice=%s).",
        cfg.openai.model,
        cfg.openai.voice,
    )
    realtime_model = openai.realtime.RealtimeModel(
        model=cfg.openai.model,
        voice=cfg.openai.voice,
        api_key=cfg.openai.api_key,
        # Phone microphones are commonly used at a distance and in noisy
        # environments. OpenAI performs this before server-side turn detection.
        input_audio_noise_reduction="far_field",
        # Keep the beginning of utterances and wait long enough for natural
        # German pauses without making the assistant feel sluggish.
        turn_detection={
            "type": "server_vad",
            "threshold": 0.55,
            "prefix_padding_ms": 500,
            "silence_duration_ms": 600,
            "create_response": True,
            "interrupt_response": True,
        },
    )
    return AgentSession(
        llm=realtime_model,
        # SIP/WebRTC already provides echo handling. Avoid delaying the first
        # utterance for the default three-second AEC warm-up.
        aec_warmup_duration=0.0,
        # Do not cut off the assistant for short noises or single filler words.
        turn_handling={
            "interruption": {
                "enabled": True,
                "mode": "vad",
                "min_duration": 0.6,
                "min_words": 2,
                "resume_false_interruption": True,
            }
        },
    )
