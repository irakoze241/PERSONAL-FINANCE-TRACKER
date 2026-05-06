from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.models import UserCreate, UserResponse, Token, LoginRequest, RefreshTokenRequest
from app.auth import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_active_user,
)
from app.database import get_db
from app.rate_limiter import limiter
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, user_data: UserCreate):
    db = get_db()

    # Check duplicates
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": user_data.username}):
        raise HTTPException(status_code=400, detail="Username already taken")

    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "currency": user_data.currency,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)

    return UserResponse(
        id=str(result.inserted_id),
        username=user_doc["username"],
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        currency=user_doc["currency"],
        created_at=user_doc["created_at"],
    )


@router.post("/login", response_model=Token)
@limiter.limit("20/minute")
async def login(request: Request, credentials: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"email": credentials.email})

    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Account is disabled")

    user_id = str(user["_id"])
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    # Store refresh token hash in DB
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow(), "refresh_token": refresh_token}},
    )

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
@limiter.limit("10/minute")
async def refresh_token(request: Request, body: RefreshTokenRequest):
    token_data = decode_token(body.refresh_token)
    if token_data is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(token_data.user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.get("refresh_token") != body.refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    user_id = str(user["_id"])
    new_access = create_access_token({"sub": user_id})
    new_refresh = create_refresh_token({"sub": user_id})

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token": new_refresh}},
    )

    return Token(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout")
@limiter.limit("10/minute")
async def logout(request: Request, current_user=Depends(get_current_active_user)):
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$unset": {"refresh_token": ""}},
    )
    return {"message": "Logged out successfully"}
