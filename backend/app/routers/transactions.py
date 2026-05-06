from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from app.models import (
    TransactionCreate, TransactionUpdate, TransactionResponse, PaginatedResponse
)
from app.auth import get_current_active_user
from app.database import get_db
from app.rate_limiter import limiter
from bson import ObjectId
import math

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def serialize_transaction(doc: dict) -> TransactionResponse:
    return TransactionResponse(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        title=doc["title"],
        amount=doc["amount"],
        type=doc["type"],
        category=doc["category"],
        date=doc["date"],
        description=doc.get("description"),
        tags=doc.get("tags", []),
        is_recurring=doc.get("is_recurring", False),
        recurrence_interval=doc.get("recurrence_interval"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("/", response_model=TransactionResponse, status_code=201)
@limiter.limit("60/minute")
async def create_transaction(
    request: Request,
    data: TransactionCreate,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    now = datetime.utcnow()
    doc = {
        "user_id": current_user.id,
        "title": data.title,
        "amount": data.amount,
        "type": data.type,
        "category": data.category.lower(),
        "date": data.date,
        "description": data.description,
        "tags": [t.lower() for t in (data.tags or [])],
        "is_recurring": data.is_recurring,
        "recurrence_interval": data.recurrence_interval,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.transactions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_transaction(doc)


@router.get("/", response_model=PaginatedResponse)
@limiter.limit("60/minute")
async def list_transactions(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    tags: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("date", pattern="^(date|amount|title|created_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    query: dict = {"user_id": current_user.id}

    if type:
        query["type"] = type
    if category:
        query["category"] = category.lower()
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    if min_amount is not None or max_amount is not None:
        query["amount"] = {}
        if min_amount is not None:
            query["amount"]["$gte"] = min_amount
        if max_amount is not None:
            query["amount"]["$lte"] = max_amount
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",")]
        query["tags"] = {"$all": tag_list}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    sort_direction = -1 if sort_order == "desc" else 1
    total = await db.transactions.count_documents(query)
    skip = (page - 1) * page_size

    cursor = db.transactions.find(query).sort(sort_by, sort_direction).skip(skip).limit(page_size)
    docs = await cursor.to_list(length=page_size)

    return PaginatedResponse(
        items=[serialize_transaction(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
        has_next=page * page_size < total,
        has_prev=page > 1,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
@limiter.limit("60/minute")
async def get_transaction(
    request: Request,
    transaction_id: str,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    doc = await db.transactions.find_one({
        "_id": ObjectId(transaction_id),
        "user_id": current_user.id,
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return serialize_transaction(doc)


@router.put("/{transaction_id}", response_model=TransactionResponse)
@limiter.limit("60/minute")
async def update_transaction(
    request: Request,
    transaction_id: str,
    data: TransactionUpdate,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    existing = await db.transactions.find_one({
        "_id": ObjectId(transaction_id),
        "user_id": current_user.id,
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_fields = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if "category" in update_fields:
        update_fields["category"] = update_fields["category"].lower()
    if "tags" in update_fields:
        update_fields["tags"] = [t.lower() for t in update_fields["tags"]]
    update_fields["updated_at"] = datetime.utcnow()

    await db.transactions.update_one(
        {"_id": ObjectId(transaction_id)},
        {"$set": update_fields},
    )

    updated = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    return serialize_transaction(updated)


@router.delete("/{transaction_id}", status_code=204)
@limiter.limit("60/minute")
async def delete_transaction(
    request: Request,
    transaction_id: str,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    result = await db.transactions.delete_one({
        "_id": ObjectId(transaction_id),
        "user_id": current_user.id,
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
