from fastapi import FastAPI
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from sqlalchemy import text

from starlette.status import HTTP_200_OK

# Project modules
from core.database.session.database import create_db_schema, get_db
from services.alemllm.router.router import router as alemllm_router
from services.best_side.router.router import router as best_side_router
from services.ml_data.router.router import router as ml_data_router
from services.tree_optimizer.router.router import router as tree_optimizer_router
from services.solar_flowers.router.router import router as solar_optimizer_router
from services.chat.router.router import router as chat_router
from services.voice.router.router import router as voice_router
from services.telegram_bot.router.router import router as telegram_router
from services.telegram_bot.bot import get_application as get_telegram_app

app = FastAPI(
    title="BUTAQ Team Backend",
    description="backend integration with Alem Plus",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alemllm_router)
app.include_router(best_side_router)
app.include_router(ml_data_router)
app.include_router(tree_optimizer_router)
app.include_router(solar_optimizer_router)
app.include_router(chat_router)
app.include_router(voice_router)
app.include_router(telegram_router)


@app.on_event("startup")
async def startup_event() -> None:
    create_db_schema()
    # Initialize Telegram bot — starts polling automatically if token is set
    try:
        tg_app = get_telegram_app()
        if tg_app is not None:
            await tg_app.initialize()
            await tg_app.start()
            await tg_app.updater.start_polling(drop_pending_updates=True)
            me = await tg_app.bot.get_me()
            import sys
            print(f"[Telegram] Bot @{me.username} started polling!", flush=True, file=sys.stderr)
        else:
            import sys
            print("[Telegram] No bot token — skipping", flush=True, file=sys.stderr)
    except Exception as e:
        import sys
        print(f"[Telegram] Failed to start bot: {e}", flush=True, file=sys.stderr)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    tg_app = get_telegram_app()
    if tg_app is not None and tg_app.running:
        await tg_app.updater.stop()
        await tg_app.stop()
        await tg_app.shutdown()

@app.get("/health", tags=["health"],status_code=HTTP_200_OK)
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint to verify that the server and database are running.
    """
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
        status = "ok"
    except Exception:
        db_status = "disconnected"
        status = "error" 


    return {
        "status": status,
        "database": db_status,
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", 
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
