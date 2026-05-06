from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from bson import ObjectId


# ── Helpers ──────────────────────────────────────────────────────────────────

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_function(
            lambda v: cls.validate(v),
            serialization=core_schema.to_string_ser_schema(),
        )


# ── User Models ───────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    currency: str = Field(default="USD", max_length=3)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    currency: Optional[str] = None
    email: Optional[EmailStr] = None


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = None
    currency: str = "USD"
    created_at: datetime

    class Config:
        from_attributes = True


class UserInDB(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = None
    username: str
    email: str
    hashed_password: str
    full_name: Optional[str] = None
    currency: str = "USD"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True


# ── Auth Models ───────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── Transaction Models ────────────────────────────────────────────────────────

TransactionType = Literal["income", "expense"]

CATEGORIES = [
    "food", "transport", "housing", "entertainment", "health",
    "education", "shopping", "utilities", "savings", "investment",
    "salary", "freelance", "other"
]


class TransactionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)
    type: TransactionType
    category: str = Field(..., min_length=1, max_length=50)
    date: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = Field(default_factory=list)
    is_recurring: bool = False
    recurrence_interval: Optional[Literal["daily", "weekly", "monthly", "yearly"]] = None


class TransactionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[TransactionType] = None
    category: Optional[str] = None
    date: Optional[datetime] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_recurring: Optional[bool] = None
    recurrence_interval: Optional[Literal["daily", "weekly", "monthly", "yearly"]] = None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    amount: float
    type: TransactionType
    category: str
    date: datetime
    description: Optional[str] = None
    tags: List[str] = []
    is_recurring: bool = False
    recurrence_interval: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TransactionFilter(BaseModel):
    type: Optional[TransactionType] = None
    category: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    tags: Optional[List[str]] = None
    search: Optional[str] = None


# ── Budget Models ─────────────────────────────────────────────────────────────

class BudgetCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    limit: float = Field(..., gt=0)
    period: Literal["monthly", "weekly", "yearly"] = "monthly"
    alert_threshold: float = Field(default=80.0, ge=0, le=100)


class BudgetUpdate(BaseModel):
    limit: Optional[float] = Field(None, gt=0)
    period: Optional[Literal["monthly", "weekly", "yearly"]] = None
    alert_threshold: Optional[float] = Field(None, ge=0, le=100)


class BudgetResponse(BaseModel):
    id: str
    user_id: str
    category: str
    limit: float
    period: str
    alert_threshold: float
    spent: float = 0.0
    remaining: float = 0.0
    percentage_used: float = 0.0
    is_exceeded: bool = False
    created_at: datetime
    updated_at: datetime


# ── Summary Models ────────────────────────────────────────────────────────────

class CategorySummary(BaseModel):
    category: str
    total: float
    count: int
    percentage: float


class MonthlySummary(BaseModel):
    month: str
    total_income: float
    total_expenses: float
    net_savings: float
    transaction_count: int


class FinancialSummary(BaseModel):
    period: str
    total_income: float
    total_expenses: float
    net_savings: float
    savings_rate: float
    transaction_count: int
    income_by_category: List[CategorySummary]
    expenses_by_category: List[CategorySummary]
    monthly_trend: List[MonthlySummary]
    top_expense_category: Optional[str] = None
    avg_daily_expense: float = 0.0


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
