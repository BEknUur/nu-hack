from fastapi import Depends
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from sqlalchemy.orm import Session

from starlette.status import HTTP_200_OK

# Project modules
from core.database.session.database import create_db_schema, get_db
from services.alemllm.router.router import router as alemllm_router
from services.auth.router.router import router as auth_router
from services.best_side.router.router import router as best_side_router
from services.chat.router.router import router as chat_router
from services.ml_data.router.router import router as ml_data_router
from services.solar_flowers.router.router import router as solar_optimizer_router
from services.telegram_bot.lifecycle import startup_telegram, shutdown_telegram
from services.telegram_bot.router.router import router as telegram_router
from services.tree_optimizer.router.router import router as tree_optimizer_router
from services.voice.router.router import router as voice_router
from services.text_to_image.router.router import router as text_to_image_router
from services.heat.router.router import router as heat_router
from services.heat_engine import get_grid, get_grid_source, get_grid_cell_count

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
app.include_router(auth_router)
app.include_router(text_to_image_router)
app.include_router(heat_router)


@app.on_event("startup")
async def startup_event() -> None:
    create_db_schema()
    await startup_telegram()
    get_grid()  # preload LST/NDVI grid once at startup


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await shutdown_telegram()


@app.get("/health", tags=["health"], status_code=HTTP_200_OK)
def health_check():
    """
    Health check endpoint. Works without a database connection.
    """
    try:
        from core.database.session.database import SessionLocal
        from sqlalchemy import text as _text
        db = SessionLocal()
        db.execute(_text("SELECT 1"))
        db.close()
        db_status = "connected"
    except Exception:
        db_status = "unavailable"

    return {
        "status": "ok",
        "database": db_status,
        "grid_source": get_grid_source(),
        "cells": get_grid_cell_count(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
