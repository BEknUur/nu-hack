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
        self.assertNotIn("After every response", prompt)
        self.assertNotIn("Format them exactly like this", prompt)
