from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from app.models import BudgetCreate, BudgetUpdate, BudgetResponse
from app.auth import get_current_active_user
from app.database import get_db
from app.rate_limiter import limiter
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def get_date_range(period: str):
    now = datetime.utcnow()
    if period == "monthly":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        # Use timedelta to avoid replace(day=0) crash on Mondays
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "yearly":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, now


async def enrich_budget(db, budget_doc: dict) -> BudgetResponse:
    start, end = get_date_range(budget_doc["period"])

    pipeline = [
        {
            "$match": {
                "user_id": budget_doc["user_id"],
                "category": budget_doc["category"],
                "type": "expense",
                "date": {"$gte": start, "$lte": end},
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    result = await db.transactions.aggregate(pipeline).to_list(1)
    spent = result[0]["total"] if result else 0.0

    limit = budget_doc["limit"]
    remaining = max(0.0, limit - spent)
    percentage_used = (spent / limit * 100) if limit > 0 else 0.0

    return BudgetResponse(
        id=str(budget_doc["_id"]),
        user_id=budget_doc["user_id"],
        category=budget_doc["category"],
        limit=limit,
        period=budget_doc["period"],
        alert_threshold=budget_doc.get("alert_threshold", 80.0),
        spent=spent,
        remaining=remaining,
        percentage_used=round(percentage_used, 2),
        is_exceeded=spent > limit,
        created_at=budget_doc["created_at"],
        updated_at=budget_doc["updated_at"],
    )


@router.post("/", response_model=BudgetResponse, status_code=201)
@limiter.limit("30/minute")
async def create_budget(
    request: Request,
    data: BudgetCreate,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    existing = await db.budgets.find_one({
        "user_id": current_user.id,
        "category": data.category.lower(),
    })
    if existing:
        raise HTTPException(status_code=400, detail="Budget for this category already exists")

    now = datetime.utcnow()
    doc = {
        "user_id": current_user.id,
        "category": data.category.lower(),
        "limit": data.limit,
        "period": data.period,
        "alert_threshold": data.alert_threshold,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.budgets.insert_one(doc)
    doc["_id"] = result.inserted_id
    return await enrich_budget(db, doc)


@router.get("/", response_model=List[BudgetResponse])
@limiter.limit("60/minute")
async def list_budgets(
    request: Request,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    docs = await db.budgets.find({"user_id": current_user.id}).to_list(100)
    return [await enrich_budget(db, d) for d in docs]


@router.get("/{budget_id}", response_model=BudgetResponse)
@limiter.limit("60/minute")
async def get_budget(
    request: Request,
    budget_id: str,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    if not ObjectId.is_valid(budget_id):
        raise HTTPException(status_code=400, detail="Invalid budget ID")

    doc = await db.budgets.find_one({
        "_id": ObjectId(budget_id),
        "user_id": current_user.id,
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Budget not found")

    return await enrich_budget(db, doc)


@router.put("/{budget_id}", response_model=BudgetResponse)
@limiter.limit("30/minute")
async def update_budget(
    request: Request,
    budget_id: str,
    data: BudgetUpdate,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    if not ObjectId.is_valid(budget_id):
        raise HTTPException(status_code=400, detail="Invalid budget ID")

    existing = await db.budgets.find_one({
        "_id": ObjectId(budget_id),
        "user_id": current_user.id,
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Budget not found")

    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    update_fields["updated_at"] = datetime.utcnow()

    await db.budgets.update_one(
        {"_id": ObjectId(budget_id)},
        {"$set": update_fields},
    )
    updated = await db.budgets.find_one({"_id": ObjectId(budget_id)})
    return await enrich_budget(db, updated)


@router.delete("/{budget_id}", status_code=204)
@limiter.limit("30/minute")
async def delete_budget(
    request: Request,
    budget_id: str,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    if not ObjectId.is_valid(budget_id):
        raise HTTPException(status_code=400, detail="Invalid budget ID")

    result = await db.budgets.delete_one({
        "_id": ObjectId(budget_id),
        "user_id": current_user.id,
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
