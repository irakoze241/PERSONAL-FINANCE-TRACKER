# FinTrack – Personal Finance Tracker

> A full-stack personal finance tracker built with **FastAPI**, **React 19 (Vite)**, and **MongoDB**.  
> Track income, expenses, budgets, and analytics in one beautiful dark-mode dashboard.


---

##  Features

-  **Secure Auth** — JWT access & refresh tokens, bcrypt password hashing, silent token rotation
-  **Transactions** — Full CRUD with search, filters (type, category, date, amount), sorting, and pagination
-  **Budgets** — Per-category spending limits with real-time progress bars, alert thresholds, and exceeded/near-limit badges
-  **Analytics** — Period-selectable (week/month/quarter/year) financial summary with income vs expense bar charts, pie breakdowns, savings trend, and category tables
-  **Dashboard** — Stat cards, cash flow area chart, expenses donut chart, and recent transactions at a glance
-  **Settings** — Profile management, currency selector, account deletion with confirmation
-  **Rate Limiting** — Per-user API rate limiting (60 req/min) via slowapi with graceful 429 responses
-  **Responsive** — Mobile-friendly layout, sidebar collapses on small screens

---

## 🛠 Tech Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Backend    | Python 3.13 · FastAPI · Uvicorn                     |
| Database   | MongoDB · Motor (async driver)                      |
| Auth       | JWT (python-jose) · bcrypt (passlib)                |
| Rate Limit | slowapi (per-user key, IP fallback)                 |
| Frontend   | React 19 · Vite · React Router v7                   |
| Charts     | Recharts (Area, Bar, Pie, Line)                     |
| UI         | Vanilla CSS · Lucide Icons · react-hot-toast        |

---

##  Getting Started

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **MongoDB** running locally on `mongodb://localhost:27017`  
  *(or update `MONGODB_URL` in `.env` to point to MongoDB Atlas)*

---

### 1 — Clone & navigate

```bash
git clone <your-repo-url>
cd "PERSONAL FINANCE TRACKER"
```

---

### 2 — Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\activate        # Windows PowerShell
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
copy .env.example .env         # Windows
# cp .env.example .env         # macOS / Linux
# → Edit .env and set a strong SECRET_KEY

# Start the API server
python run.py
```

> Backend running at **http://localhost:8000**  
> Interactive API docs at **http://localhost:8000/docs**

---

### 3 — Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

> Frontend running at **http://localhost:5173**

---

##  Environment Variables

File: `backend/.env`

| Variable                        | Default                       | Description                        |
|---------------------------------|-------------------------------|------------------------------------|
| `MONGODB_URL`                   | `mongodb://localhost:27017`   | MongoDB connection string           |
| `DATABASE_NAME`                 | `personal_finance_tracker`    | MongoDB database name               |
| `SECRET_KEY`                    | *(required — change this!)*   | JWT signing secret                  |
| `ALGORITHM`                     | `HS256`                       | JWT signing algorithm               |
| `ACCESS_TOKEN_EXPIRE_MINUTES`   | `30`                          | Access token lifetime (minutes)     |
| `REFRESH_TOKEN_EXPIRE_DAYS`     | `7`                           | Refresh token lifetime (days)       |
| `RATE_LIMIT_PER_MINUTE`         | `60`                          | Default API rate limit              |

>  **Always set a strong `SECRET_KEY` in production.** Never commit your `.env` to version control.

---

## 📡 API Reference

All endpoints are prefixed with `/api/v1`.  
Full interactive docs: **http://localhost:8000/docs**

### Authentication

| Method | Endpoint          | Description                        | Auth Required |
|--------|-------------------|------------------------------------|:-------------:|
| POST   | `/auth/register`  | Register a new account             | ✗             |
| POST   | `/auth/login`     | Login and receive tokens           | ✗             |
| POST   | `/auth/refresh`   | Refresh an expired access token    | ✗             |
| POST   | `/auth/logout`    | Logout and revoke refresh token    | ✓             |

### Users

| Method | Endpoint     | Description                             | Auth Required |
|--------|--------------|-----------------------------------------|:-------------:|
| GET    | `/users/me`  | Get current user profile                | ✓             |
| PUT    | `/users/me`  | Update name, email, or currency         | ✓             |
| DELETE | `/users/me`  | Delete account and all associated data  | ✓             |

### Transactions

| Method | Endpoint                  | Description                                 | Auth Required |
|--------|---------------------------|---------------------------------------------|:-------------:|
| GET    | `/transactions/`          | List transactions (filterable, paginated)   | ✓             |
| POST   | `/transactions/`          | Create a new transaction                    | ✓             |
| GET    | `/transactions/{id}`      | Get a single transaction                    | ✓             |
| PUT    | `/transactions/{id}`      | Update a transaction                        | ✓             |
| DELETE | `/transactions/{id}`      | Delete a transaction                        | ✓             |

**Transaction filter query params:** `type`, `category`, `start_date`, `end_date`, `min_amount`, `max_amount`, `tags`, `search`, `sort_by`, `sort_order`, `page`, `page_size`

### Budgets

| Method | Endpoint           | Description                                    | Auth Required |
|--------|--------------------|------------------------------------------------|:-------------:|
| GET    | `/budgets/`        | List all budgets with live spend calculations  | ✓             |
| POST   | `/budgets/`        | Create a budget for a category                 | ✓             |
| GET    | `/budgets/{id}`    | Get a single budget                            | ✓             |
| PUT    | `/budgets/{id}`    | Update limit, period, or alert threshold       | ✓             |
| DELETE | `/budgets/{id}`    | Delete a budget                                | ✓             |

### Financial Summary

| Method | Endpoint     | Description                                         | Auth Required |
|--------|--------------|-----------------------------------------------------|:-------------:|
| GET    | `/summary/`  | Get aggregated financial analytics for a period     | ✓             |

**Summary query params:** `period` (`week` | `month` | `quarter` | `year`), `start_date`, `end_date`

---

##  Project Structure

```
PERSONAL FINANCE TRACKER/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app, CORS middleware, rate limiter setup
│   │   ├── config.py           # Pydantic settings loaded from .env
│   │   ├── database.py         # MongoDB async connection + index creation
│   │   ├── auth.py             # JWT encode/decode, bcrypt, current_user dependency
│   │   ├── models.py           # All Pydantic request/response models
│   │   ├── rate_limiter.py     # Per-user slowapi limiter (falls back to IP)
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py         # /auth/* endpoints
│   │       ├── users.py        # /users/me endpoints
│   │       ├── transactions.py # /transactions/* endpoints
│   │       ├── budgets.py      # /budgets/* endpoints + live spend aggregation
│   │       └── summary.py      # /summary/* MongoDB aggregation pipelines
│   ├── run.py                  # Uvicorn server entry point
│   ├── requirements.txt
│   ├── .env                    # Local environment config (gitignored)
│   └── .env.example
│
└── frontend/
    ├── public/
    │   └── favicon.svg
    ├── src/
    │   ├── main.jsx              # React DOM entry point
    │   ├── App.jsx               # Router, protected/guest route guards
    │   ├── index.css             # Complete design system (CSS variables, dark theme)
    │   ├── api.js                # Fetch wrapper with auto token refresh on 401
    │   ├── contexts/
    │   │   └── AuthContext.jsx   # Auth state, login/logout/register actions
    │   ├── components/
    │   │   └── Sidebar.jsx       # Navigation sidebar with user info
    │   └── pages/
    │       ├── LoginPage.jsx
    │       ├── RegisterPage.jsx
    │       ├── DashboardPage.jsx   # Overview stats, charts, recent transactions
    │       ├── TransactionsPage.jsx # CRUD table with filters and pagination
    │       ├── BudgetsPage.jsx     # Budget cards with progress tracking
    │       ├── SummaryPage.jsx     # Full analytics with multiple chart types
    │       └── SettingsPage.jsx    # Profile, currency, account management
    ├── docs/
    │   └── screenshots/          # App screenshots for README
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

##  MongoDB Collections

| Collection     | Description                                  | Key Indexes                                             |
|----------------|----------------------------------------------|---------------------------------------------------------|
| `users`        | User accounts with hashed passwords          | `email` (unique), `username` (unique)                   |
| `transactions` | Income and expense records per user          | `user_id`, `(user_id, date)`, `(user_id, category)`    |
| `budgets`      | Per-category budget limits per user          | `(user_id, category)` (unique)                          |

All indexes are created automatically on server startup.

---

##  Security Notes

- Passwords are hashed with **bcrypt** — never stored in plain text
- JWT tokens are signed with `HS256` — set a strong, random `SECRET_KEY`
- Refresh tokens are stored in the DB and **revoked on logout**
- Each user can only access their **own** data (user-scoped queries throughout)
- Rate limiting prevents brute-force and API abuse
- CORS is configured to only allow `localhost:5173` and `localhost:3000`

---

##  Transaction Categories

`food` · `transport` · `housing` · `entertainment` · `health` · `education` · `shopping` · `utilities` · `savings` · `investment` · `salary` · `freelance` · `other`

---

##  License

MIT — free to use, modify, and distribute.
