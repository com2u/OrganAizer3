"""Regression tests for browser-reachable LiveKit token URLs."""

import unittest
from unittest.mock import patch

from backend.telephony.livekit_token import _browser_url, issue_web_token


class BrowserLiveKitUrlTests(unittest.TestCase):
    def test_public_wss_url_is_preserved(self):
        self.assertEqual(
            _browser_url("wss://voice.example.org", "https://api.example.org"),
            "wss://voice.example.org",
        )

    def test_local_url_is_replaced_from_https_api_origin(self):
        self.assertEqual(
            _browser_url("ws://localhost:7880", "https://api.example.org"),
            "wss://api.example.org",
        )

    def test_local_url_without_external_origin_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "localhost"):
            _browser_url("ws://localhost:7880", "http://127.0.0.1:4815")

    @patch("backend.telephony.livekit_token.config_store.get_value")
    def test_token_uses_external_request_origin(self, get_value):
        values = {
            "livekit_api_key": "test-key",
            "livekit_api_secret": "a-secure-test-secret-that-is-long-enough",
            "web_room_name": "organaizer-web",
            "livekit_public_url": "ws://localhost:7880",
            "livekit_url": "ws://localhost:7880",
        }
        get_value.side_effect = values.get
        result = issue_web_token(request_origin="https://api.example.org")
        self.assertEqual(result["url"], "wss://api.example.org")
        self.assertEqual(result["room"], "organaizer-web")
        self.assertTrue(result["token"])


if __name__ == "__main__":
    unittest.main()
