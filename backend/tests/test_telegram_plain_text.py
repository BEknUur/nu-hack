import unittest

from services.telegram_bot.plain_text import prepare_telegram_text


class TestTelegramPlainText(unittest.TestCase):
    def test_prepare_telegram_text_strips_common_markdown(self):
        raw = """### **1. Инсоляция**

---

**СН РК 2.04-01-2011**
* Минимум 2.5 часа
> Южная сторона лучше
[Источник](https://example.com)
"""

        cleaned = prepare_telegram_text(raw)

        self.assertNotIn("###", cleaned)
        self.assertNotIn("**", cleaned)
        self.assertNotIn("---", cleaned)
        self.assertIn("1. Инсоляция", cleaned)
        self.assertIn("- Минимум 2.5 часа", cleaned)
        self.assertIn("Южная сторона лучше", cleaned)
        self.assertIn("Источник: https://example.com", cleaned)
