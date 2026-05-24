from __future__ import annotations

import asyncio
import logging
from typing import Callable

from telegram.error import Conflict, TelegramError

from services.telegram_bot.config import telegram_settings

logger = logging.getLogger(__name__)


def _get_telegram_application():
    from services.telegram_bot.bot import get_application

    return get_application()


def build_polling_error_callback(tg_app) -> Callable[[TelegramError], None]:
    conflict_logged = False

    def _error_callback(error: TelegramError) -> None:
        nonlocal conflict_logged

        if isinstance(error, Conflict):
            if not conflict_logged:
                logger.warning(
                    "[Telegram] Polling conflict detected (another instance is polling). "
                    "Disabling Telegram polling for this process."
                )
                conflict_logged = True
            if tg_app.updater is not None and tg_app.updater.running:
                asyncio.create_task(tg_app.updater.stop())
            return

        logger.exception("[Telegram] Polling error: %s", error)

    return _error_callback


async def startup_telegram() -> None:
    tg_app = _get_telegram_application()
    if tg_app is None:
        logger.info("[Telegram] No bot token configured, skipping startup")
        return

    mode = telegram_settings.update_mode
    if mode == "off":
        logger.info("[Telegram] Update mode is off, skipping Telegram startup")
        return

    try:
        await tg_app.initialize()
        await tg_app.start()

        if mode == "webhook":
            me = await tg_app.bot.get_me()
            logger.info("[Telegram] Bot @%s started in webhook mode", me.username)
            return

        if tg_app.updater is None:
            logger.warning("[Telegram] Updater is unavailable, cannot start polling mode")
            return

        await tg_app.bot.delete_webhook(drop_pending_updates=True)
        await tg_app.updater.start_polling(
            drop_pending_updates=True,
            error_callback=build_polling_error_callback(tg_app),
        )

        me = await tg_app.bot.get_me()
        logger.info("[Telegram] Bot @%s started polling", me.username)
    except Exception:
        logger.exception("[Telegram] Failed to start in %s mode", mode)


async def shutdown_telegram() -> None:
    tg_app = _get_telegram_application()
    if tg_app is None:
        return

    try:
        if tg_app.updater is not None and tg_app.updater.running:
            await tg_app.updater.stop()

        if tg_app.running:
            await tg_app.stop()

        if tg_app.initialized:
            await tg_app.shutdown()
    except Exception:
        logger.exception("[Telegram] Failed during shutdown")
