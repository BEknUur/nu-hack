import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from telegram.error import Conflict

from services.telegram_bot import lifecycle


class FakeUpdater:
    def __init__(self) -> None:
        self.running = False
        self.start_polling_calls = []
        self.stop_calls = 0

    async def start_polling(self, **kwargs):
        self.running = True
        self.start_polling_calls.append(kwargs)

    async def stop(self):
        self.stop_calls += 1
        self.running = False


class FakeBot:
    def __init__(self) -> None:
        self.delete_webhook_calls = []
        self.get_me_calls = 0

    async def delete_webhook(self, **kwargs):
        self.delete_webhook_calls.append(kwargs)

    async def get_me(self):
        self.get_me_calls += 1
        return SimpleNamespace(username="test_bot")


class FakeTelegramApp:
    def __init__(self) -> None:
        self.bot = FakeBot()
        self.updater = FakeUpdater()
        self.initialized = False
        self.running = False
        self.initialize_calls = 0
        self.start_calls = 0
        self.stop_calls = 0
        self.shutdown_calls = 0

    async def initialize(self):
        self.initialize_calls += 1
        self.initialized = True

    async def start(self):
        self.start_calls += 1
        self.running = True

    async def stop(self):
        self.stop_calls += 1
        self.running = False

    async def shutdown(self):
        self.shutdown_calls += 1
        self.initialized = False


class TelegramStartupTests(unittest.IsolatedAsyncioTestCase):
    async def test_off_mode_skips_telegram_startup(self):
        tg_app = FakeTelegramApp()

        with patch.object(lifecycle, "_get_telegram_application", return_value=tg_app), patch.object(
            lifecycle.telegram_settings, "update_mode", "off"
        ):
            await lifecycle.startup_telegram()

        self.assertEqual(tg_app.initialize_calls, 0)
        self.assertEqual(tg_app.start_calls, 0)
        self.assertEqual(len(tg_app.updater.start_polling_calls), 0)

    async def test_webhook_mode_initializes_without_polling(self):
        tg_app = FakeTelegramApp()

        with patch.object(lifecycle, "_get_telegram_application", return_value=tg_app), patch.object(
            lifecycle.telegram_settings, "update_mode", "webhook"
        ):
            await lifecycle.startup_telegram()

        self.assertEqual(tg_app.initialize_calls, 1)
        self.assertEqual(tg_app.start_calls, 1)
        self.assertEqual(len(tg_app.updater.start_polling_calls), 0)
        self.assertEqual(len(tg_app.bot.delete_webhook_calls), 0)

    async def test_polling_mode_deletes_webhook_and_starts_polling(self):
        tg_app = FakeTelegramApp()

        with patch.object(lifecycle, "_get_telegram_application", return_value=tg_app), patch.object(
            lifecycle.telegram_settings, "update_mode", "polling"
        ):
            await lifecycle.startup_telegram()

        self.assertEqual(tg_app.initialize_calls, 1)
        self.assertEqual(tg_app.start_calls, 1)
        self.assertEqual(len(tg_app.bot.delete_webhook_calls), 1)
        self.assertEqual(tg_app.bot.delete_webhook_calls[0], {"drop_pending_updates": True})
        self.assertEqual(len(tg_app.updater.start_polling_calls), 1)
        self.assertEqual(tg_app.updater.start_polling_calls[0]["drop_pending_updates"], True)
        self.assertIn("error_callback", tg_app.updater.start_polling_calls[0])

    async def test_conflict_callback_stops_polling(self):
        tg_app = FakeTelegramApp()
        tg_app.updater.running = True
        callback = lifecycle.build_polling_error_callback(tg_app)

        callback(Conflict("terminated by other getUpdates request"))
        await asyncio.sleep(0)

        self.assertEqual(tg_app.updater.stop_calls, 1)
        self.assertFalse(tg_app.updater.running)

    async def test_shutdown_skips_updater_stop_if_not_running(self):
        tg_app = FakeTelegramApp()
        tg_app.initialized = True
        tg_app.running = True
        tg_app.updater.running = False

        with patch.object(lifecycle, "_get_telegram_application", return_value=tg_app):
            await lifecycle.shutdown_telegram()

        self.assertEqual(tg_app.updater.stop_calls, 0)
        self.assertEqual(tg_app.stop_calls, 1)
        self.assertEqual(tg_app.shutdown_calls, 1)


if __name__ == "__main__":
    unittest.main()
