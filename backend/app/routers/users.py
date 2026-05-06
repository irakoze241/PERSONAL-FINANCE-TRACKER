from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from app.models import UserResponse, UserUpdate
from app.auth import get_current_active_user, get_password_hash
from app.database import get_db
from app.rate_limiter import limiter
from bson import ObjectId

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
@limiter.limit("60/minute")
async def get_me(request: Request, current_user=Depends(get_current_active_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        currency=current_user.currency,
        created_at=current_user.created_at,
    )


@router.put("/me", response_model=UserResponse)
@limiter.limit("30/minute")
async def update_me(
    request: Request,
    update_data: UserUpdate,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Check email uniqueness if updating email
    if "email" in update_fields:
        existing = await db.users.find_one({"email": update_fields["email"]})
        if existing and str(existing["_id"]) != current_user.id:
            raise HTTPException(status_code=400, detail="Email already in use")

    update_fields["updated_at"] = datetime.utcnow()

    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_fields},
    )

    updated = await db.users.find_one({"_id": ObjectId(current_user.id)})
    return UserResponse(
        id=str(updated["_id"]),
        username=updated["username"],
        email=updated["email"],
        full_name=updated.get("full_name"),
        currency=updated.get("currency", "USD"),
        created_at=updated["created_at"],
    )


@router.delete("/me")
@limiter.limit("5/minute")
async def delete_me(
    request: Request,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    user_oid = ObjectId(current_user.id)

    # Cascade delete
    await db.transactions.delete_many({"user_id": current_user.id})
    await db.budgets.delete_many({"user_id": current_user.id})
    await db.users.delete_one({"_id": user_oid})

    return {"message": "Account and all associated data deleted"}
