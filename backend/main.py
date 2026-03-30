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


@app.on_event("startup")
def startup_event() -> None:
    create_db_schema()

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
