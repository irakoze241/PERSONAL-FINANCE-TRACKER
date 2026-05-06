from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Request, Query
from app.models import FinancialSummary, CategorySummary, MonthlySummary
from app.auth import get_current_active_user
from app.database import get_db
from app.rate_limiter import limiter

router = APIRouter(prefix="/summary", tags=["Financial Summary"])


def get_period_range(period: str, start_date: Optional[datetime], end_date: Optional[datetime]):
    now = datetime.utcnow()
    if start_date and end_date:
        return start_date, end_date, "custom"
    if period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=month, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, now, period


@router.get("/", response_model=FinancialSummary)
@limiter.limit("30/minute")
async def get_summary(
    request: Request,
    period: str = Query("month", pattern="^(week|month|quarter|year)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    start, end, period_label = get_period_range(period, start_date, end_date)

    match_stage = {
        "$match": {
            "user_id": current_user.id,
            "date": {"$gte": start, "$lte": end},
        }
    }

    # Total income/expense aggregate
    totals_pipeline = [
        match_stage,
        {
            "$group": {
                "_id": "$type",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
    ]
    totals_result = await db.transactions.aggregate(totals_pipeline).to_list(10)
    totals = {r["_id"]: {"total": r["total"], "count": r["count"]} for r in totals_result}

    total_income = totals.get("income", {}).get("total", 0.0)
    total_expenses = totals.get("expense", {}).get("total", 0.0)
    income_count = totals.get("income", {}).get("count", 0)
    expense_count = totals.get("expense", {}).get("count", 0)
    transaction_count = income_count + expense_count
    net_savings = total_income - total_expenses
    savings_rate = (net_savings / total_income * 100) if total_income > 0 else 0.0

    # By-category aggregates
    cat_pipeline_base = lambda tx_type: [
        {
            "$match": {
                "user_id": current_user.id,
                "date": {"$gte": start, "$lte": end},
                "type": tx_type,
            }
        },
        {
            "$group": {
                "_id": "$category",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"total": -1}},
    ]

    income_cats_raw = await db.transactions.aggregate(cat_pipeline_base("income")).to_list(50)
    expense_cats_raw = await db.transactions.aggregate(cat_pipeline_base("expense")).to_list(50)

    def to_category_summaries(raw_list, grand_total) -> list[CategorySummary]:
        return [
            CategorySummary(
                category=r["_id"],
                total=r["total"],
                count=r["count"],
                percentage=round(r["total"] / grand_total * 100, 2) if grand_total > 0 else 0.0,
            )
            for r in raw_list
        ]

    income_by_cat = to_category_summaries(income_cats_raw, total_income)
    expense_by_cat = to_category_summaries(expense_cats_raw, total_expenses)

    top_expense = expense_by_cat[0].category if expense_by_cat else None

    # Days in period for avg daily expense
    days_in_period = max((end - start).days, 1)
    avg_daily_expense = total_expenses / days_in_period

    # Monthly trend
    monthly_pipeline = [
        match_stage,
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"},
                    "type": "$type",
                },
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    monthly_raw = await db.transactions.aggregate(monthly_pipeline).to_list(100)

    # Group by year-month
    monthly_map: dict = {}
    for r in monthly_raw:
        key = f"{r['_id']['year']}-{r['_id']['month']:02d}"
        if key not in monthly_map:
            monthly_map[key] = {
                "total_income": 0.0,
                "total_expenses": 0.0,
                "transaction_count": 0,
            }
        if r["_id"]["type"] == "income":
            monthly_map[key]["total_income"] += r["total"]
        else:
            monthly_map[key]["total_expenses"] += r["total"]
        monthly_map[key]["transaction_count"] += r["count"]

    monthly_trend = [
        MonthlySummary(
            month=month,
            total_income=v["total_income"],
            total_expenses=v["total_expenses"],
            net_savings=v["total_income"] - v["total_expenses"],
            transaction_count=v["transaction_count"],
        )
        for month, v in sorted(monthly_map.items())
    ]

    return FinancialSummary(
        period=period_label,
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=net_savings,
        savings_rate=round(savings_rate, 2),
        transaction_count=transaction_count,
        income_by_category=income_by_cat,
        expenses_by_category=expense_by_cat,
        monthly_trend=monthly_trend,
        top_expense_category=top_expense,
        avg_daily_expense=round(avg_daily_expense, 2),
    )
