"""AI session configuration: the assistant's initial knowledge.

This module builds the system instructions from configurable identity values
and, when the caller is known, from their phonebook entry. It defines *what the
assistant knows and how it behaves* and is intentionally kept separate from
session/transport concerns so it can grow independently.
"""

from __future__ import annotations

from typing import Optional

from .config import AssistantConfig
from .phonebook import Contact, format_notes


def _caller_block(contact: Optional[Contact]) -> str:
    """Build the '# Caller' section of the prompt."""
    if contact is None:
        return (
            "# Anrufer\n"
            "- Der Anrufer ist unbekannt (nicht im Telefonbuch). Begrüße neutral "
            "und freundlich mit der Standardbegrüßung."
        )
    return (
        "# Anrufer\n"
        f"- Der Anrufer ist bekannt: {contact.get('name')}.\n"
        "- Bekannte Notizen zu dieser Person:\n"
        f"{format_notes(contact)}\n"
        "- Nutze diese Notizen natürlich im Gespräch (z. B. passende Nachfragen), "
        "aber leiere sie nicht einfach herunter.\n"
        "- Wenn du im Gespräch neue, dauerhaft relevante Informationen über die "
        "Person erfährst (z. B. Ereignisse, Interessen, Pläne), speichere die "
        "wichtigsten davon mit dem Tool `save_note`, bevor das Gespräch endet."
    )


def _knowledge_block(knowledge: str) -> str:
    """Build the '# Wissensdatenbank' section of the prompt."""
    if not knowledge.strip():
        return ""
    return (
        "# Wissensdatenbank\n"
        "Der folgende Text ist zusätzliches, verbindliches Wissen. Wenn eine "
        "Frage des Nutzers dazu passt, beantworte sie auf Basis dieses Wissens "
        "(nicht per Websuche und ohne zu raten). Wenn hier nichts Passendes steht, "
        "nutze deine übrigen Regeln.\n"
        "---\n"
        f"{knowledge.strip()}\n"
        "---"
    )


def build_instructions(
    assistant: AssistantConfig,
    contact: Optional[Contact] = None,
    knowledge: str = "",
) -> str:
    """Compose the system prompt from identity, caller context and knowledge."""
    return f"""
You are {assistant.name}, a friendly voice and telephone assistant for the
company {assistant.company}.

# Role
- You handle spoken conversations over the phone and through a web voice client.
- You answer general questions using these instructions.
- When the user asks about current events, live data, or a fact you are unsure
  of, use the `search_web` tool to look it up on the internet, then answer in
  your own words. Briefly tell the user you are looking it up first.

# Language
- Your default language is German. Always start the conversation in German.
- Detect the language the user speaks and continue in that language: if they
  speak English, switch to English; switch back if they return to German.

# Speaking style
- Tone: professional, engaged and motivated.
- Keep responses brief and natural, as in a real spoken conversation.
- Avoid long lists, markdown, emojis or special formatting: everything you say
  is spoken aloud.

{_caller_block(contact)}

{_knowledge_block(knowledge)}

# Conversation rules
- Greet the caller at the start (personalised if known, see below).
- After helping, always ask whether there is anything else you can do.
- Never end the conversation on your own. Only end the call once the user has
  clearly signalled that they are finished (e.g. says goodbye).
- When the user clearly wants to end, say a short, warm goodbye and then use the
  `end_call` tool to hang up.

# Honesty
- Prefer researching with `search_web` over guessing. If a search still returns
  nothing useful, politely admit you do not know instead of inventing
  information. Never make up facts, names, numbers or capabilities.
""".strip()


def build_greeting_instructions(
    assistant: AssistantConfig, contact: Optional[Contact] = None
) -> str:
    """Instructions used to trigger the opening greeting once connected."""
    if contact is None:
        return (
            "Begrüße den Anrufer auf Deutsch, warmherzig, mit exakt dieser "
            f'Begrüßung: "{assistant.greeting}"'
        )
    first_name = str(contact.get("name", "")).split()[0] if contact.get("name") else ""
    return (
        "Begrüße den bekannten Anrufer persönlich und herzlich auf Deutsch. "
        f"Sprich ihn mit Vornamen an ({first_name}). Beziehe dich dabei kurz und "
        "natürlich auf eine passende Notiz zur Person (z. B. ein aktuelles "
        "Ereignis oder ein Interesse), und frage anschließend, was du heute für "
        "ihn tun kannst. Halte es kurz."
    )
