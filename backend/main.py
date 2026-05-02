from fastapi import FastAPI
from services.alemllm.router.router import router as alemllm_router

app = FastAPI(
    title="BUTAQ Team Backend",
    description="backend integration with Alem Plus",
)

app.include_router(alemllm_router)

@app.get("/health", tags=["health"])
async def health_check():

    """
    Health check endpoint to verify that the server is running.
    """


    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", 
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
