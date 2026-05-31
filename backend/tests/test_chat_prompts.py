import unittest

from services.chat.prompts import build_system_prompt


class TestChatPrompts(unittest.TestCase):
    def test_web_prompt_keeps_suggestions_block(self):
        prompt = build_system_prompt(language="ru")

        self.assertIn("[SUGGESTIONS]", prompt)
        self.assertIn("bullet points", prompt)

    def test_telegram_prompt_uses_plain_text_rules(self):
        prompt = build_system_prompt(language="ru", channel="telegram")

        self.assertIn("Use plain text only.", prompt)
        self.assertIn("Do not include any control markers such as [SUGGESTIONS].", prompt)
        self.assertIn("Do not use symbols like #, ##, ###, **, __, ---, ``` or numbered section titles.", prompt)
        self.assertNotIn("After every response", prompt)
        self.assertNotIn("Format them exactly like this", prompt)
        self.assertNotIn("## Current map context", prompt)

    def test_telegram_context_uses_plain_text_template(self):
        prompt = build_system_prompt(
            language="ru",
            channel="telegram",
            context={
                "lat": 51.1,
                "lng": 71.4,
                "zoom": 14,
                "date": "2026-04-07",
                "time": "10:00",
                "mode": "sun",
                "selectedBuilding": "test",
            },
        )

        self.assertIn("Current map context:", prompt)
        self.assertNotIn("## Current map context", prompt)
