"""Telephony integration package.

Bridges the OrganAIzer control plane (Flask) with the voice stack
(LiveKit + LiveKit SIP + OpenAI Realtime agent + Twilio) that is merged in
from the former VoiceClient project.

Modules
-------
- ``config_store``   Persist telephony settings/secrets in a protected env file.
- ``livekit_token``  Mint short-lived LiveKit access tokens for the browser
                     Dialog client (Sprache tab).
- ``voice_client``   Thin HTTP client to the local voice service (outbound
                     calls, health/status).
- ``text_assistant`` Text-only assistant used by the Telefonie "Sprachassistent"
                     tab (reuses the OpenAI key + knowledge base).
- ``call_log``       Lightweight JSON store for the call history.
- ``phonebook_store`` Shared JSON phonebook (editable in the Telefonate tab,
                     used by the phone assistant to greet and take notes).
"""
