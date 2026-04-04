"""
FastAPI router for Telegram webhook + setup endpoint.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request, Response, HTTPException
from starlette.status import HTTP_200_OK, HTTP_403_FORBIDDEN
from telegram import Update

from services.telegram_bot.config import telegram_settings
from services.telegram_bot.bot import get_application

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook", status_code=HTTP_200_OK)
async def telegram_webhook(request: Request) -> Response:
    """
    Receives updates from Telegram.
    Telegram sends a secret token header that we validate.
    """
    app = get_application()
    if app is None:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")

    # Validate secret token
    token = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if token != telegram_settings.webhook_secret:
        raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Invalid secret token")

    data = await request.json()
    update = Update.de_json(data, app.bot)

    # Process the update (runs handlers)
    await app.process_update(update)

    return Response(status_code=HTTP_200_OK)


@router.post("/setup-webhook", status_code=HTTP_200_OK)
async def setup_webhook() -> dict:
    """
    Call this once to register the webhook URL with Telegram.
    Requires TELEGRAM_WEBHOOK_URL to be set (your public server URL).
    """
    app = get_application()
    if app is None:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")

    if not telegram_settings.webhook_base_url:
        raise HTTPException(status_code=400, detail="TELEGRAM_WEBHOOK_URL not set in .env")

    webhook_url = f"{telegram_settings.webhook_base_url.rstrip('/')}/telegram/webhook"

    await app.bot.set_webhook(
        url=webhook_url,
        secret_token=telegram_settings.webhook_secret,
    )

    info = await app.bot.get_webhook_info()
    logger.info("Webhook set to: %s", info.url)

    return {
        "status": "ok",
        "webhook_url": info.url,
        "pending_update_count": info.pending_update_count,
    }


@router.delete("/webhook", status_code=HTTP_200_OK)
async def delete_webhook() -> dict:
    """Remove the webhook (useful for switching back to polling for dev)."""
    app = get_application()
    if app is None:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")

    await app.bot.delete_webhook()
    return {"status": "webhook removed"}
