"""
Entry point for the Personal Finance Tracker backend.
Run with: python run.py
Or directly: uvicorn app.main:app --reload
"""
import uvicorn  # noqa: F401 — installed in venv; configure IDE interpreter to: backend/venv/Scripts/python.exe

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
