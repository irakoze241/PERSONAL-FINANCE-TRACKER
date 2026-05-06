from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from app.database import connect_db, close_db
from app.rate_limiter import limiter
from app.routers import auth, users, transactions, budgets, summary

app = FastAPI(
    title="Personal Finance Tracker API",
    description="Secure, scalable API for managing personal finances",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Rate Limiter ──────────────────────────────────────────────────────────────
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded. Limit: {exc.limit}. Please slow down.",
            "retry_after": exc.retry_after if hasattr(exc, "retry_after") else 60,
        },
    )

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(transactions.router, prefix=PREFIX)
app.include_router(budgets.router, prefix=PREFIX)
app.include_router(summary.router, prefix=PREFIX)

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "Personal Finance Tracker API v1.0.0"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
