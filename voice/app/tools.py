"""External tools the assistant can call.

Currently provides live web research via the OpenAI Responses API and its
hosted ``web_search`` tool. This reuses the existing OpenAI API key, so no
additional service or key is required.
"""

from __future__ import annotations

import asyncio

from openai import AsyncOpenAI

from .config import Config
from .logging_config import get_logger

logger = get_logger("tools")

# Keep the spoken answer short and give the model a hard time budget so a slow
# search never stalls the live conversation.
_SEARCH_TIMEOUT_S = 20.0
_HERMES_TIMEOUT_S = 90.0

_SEARCH_PROMPT = (
    "You are the research backend of a spoken voice assistant. Search the web "
    "and answer the following question factually and concisely (2-3 sentences, "
    "plain spoken language, no markdown, no URLs). If the search yields nothing "
    "useful, say so plainly.\n\nQuestion: {query}"
)


async def web_search(query: str, cfg: Config) -> str:
    """Research ``query`` on the internet and return a short spoken answer.

    Fails gracefully: on any error or timeout it returns a polite message
    instead of raising, so the live call is never interrupted.
    """
    logger.info("Running web search: %s", query)
    try:
        async with AsyncOpenAI(api_key=cfg.openai.api_key) as client:
            response = await asyncio.wait_for(
                client.responses.create(
                    model=cfg.openai.search_model,
                    tools=[{"type": "web_search"}],
                    input=_SEARCH_PROMPT.format(query=query),
                ),
                timeout=_SEARCH_TIMEOUT_S,
            )
        answer = (response.output_text or "").strip()
        if not answer:
            return "I searched but couldn't find anything useful on that."
        logger.info("Web search succeeded (%d chars).", len(answer))
        return answer
    except asyncio.TimeoutError:
        logger.warning("Web search timed out for query: %s", query)
        return "The web search took too long, so I couldn't get an answer just now."
    except Exception:  # noqa: BLE001 - never let a tool crash the call
        logger.exception("Web search failed for query: %s", query)
        return "I'm sorry, I couldn't reach the internet to look that up right now."


_HERMES_PROMPT = (
    "Du unterstützt einen Voice-Assistenten in einem laufenden Gespräch. "
    "Bearbeite die folgende Anfrage mit deinen verbundenen Werkzeugen, "
    "insbesondere Kalender, Termine, E-Mail und weitere persönliche Dienste. "
    "Liefere ausschließlich das sachliche Ergebnis in knapper, gut vorlesbarer "
    "Form, ohne Markdown und ohne technische Details. Erfinde keine Daten. "
    "Wenn Informationen oder Berechtigungen fehlen, sage konkret, was fehlt.\n\n"
    "Anfrage: {query}"
)


async def query_hermes(query: str, cfg: Config) -> str:
    """Ask the host-local Hermes agent to use its personal-data tools."""
    query = (query or "").strip()
    if not query:
        return "Die Anfrage an Hermes war leer."
    if not cfg.hermes_api_url:
        return "Hermes ist derzeit nicht konfiguriert."

    try:
        async with AsyncOpenAI(
            api_key=cfg.hermes_api_key or "not-required",
            base_url=f"{cfg.hermes_api_url.rstrip('/')}/v1",
        ) as client:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=cfg.hermes_model,
                    messages=[
                        {
                            "role": "user",
                            "content": _HERMES_PROMPT.format(query=query),
                        }
                    ],
                ),
                timeout=_HERMES_TIMEOUT_S,
            )
        answer = response.choices[0].message.content
        return (answer or "").strip() or "Hermes hat kein Ergebnis geliefert."
    except asyncio.TimeoutError:
        logger.warning("Hermes timed out for query: %s", query)
        return "Hermes hat für diese Anfrage zu lange gebraucht."
    except Exception:  # noqa: BLE001 - never interrupt a live call
        logger.exception("Hermes request failed for query: %s", query)
        return "Hermes konnte gerade nicht erreicht werden."


_SUMMARY_TIMEOUT_S = 25.0

_SUMMARY_PROMPT = (
    "Du bist das Protokoll-Backend eines Telefon-Assistenten. Fasse das folgende "
    "Telefongespräch für das Gesprächsnotizbuch zusammen. Schreibe auf Deutsch, "
    "sachlich und knapp: 2-5 kurze Stichpunkte mit den wichtigsten Informationen, "
    "Anliegen, Ergebnissen und offenen To-dos. Nur die Stichpunkte, jeweils mit "
    "'- ' beginnend, keine Überschrift.\n\nGespräch:\n{transcript}"
)


async def summarize_conversation(transcript: str, cfg: Config) -> str:
    """Summarise a finished call into short German bullet notes.

    Fails gracefully: returns an empty string on any error so call teardown is
    never interrupted.
    """
    transcript = (transcript or "").strip()
    if not transcript:
        return ""
    try:
        async with AsyncOpenAI(api_key=cfg.openai.api_key) as client:
            response = await asyncio.wait_for(
                client.responses.create(
                    model=cfg.openai.search_model,
                    input=_SUMMARY_PROMPT.format(transcript=transcript[:12000]),
                ),
                timeout=_SUMMARY_TIMEOUT_S,
            )
        return (response.output_text or "").strip()
    except Exception:  # noqa: BLE001 - summary is best-effort
        logger.exception("Call summary failed.")
        return ""
