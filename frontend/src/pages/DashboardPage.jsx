import { useEffect, useState, useCallback } from "react";
import { summaryApi, transactionsApi } from "../api";
import { useAuth } from "../contexts/AuthContext";
import {
  TrendingUp, TrendingDown, Wallet, Target,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { format } from "date-fns";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#3b82f6", "#ec4899", "#14b8a6"];

function CurrencyFormat({ amount, currency = "USD", className = "" }) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency", currency, minimumFractionDigits: 2
  }).format(amount);
  return <span className={className}>{formatted}</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        summaryApi.get({ period }),
        transactionsApi.list({ page: 1, page_size: 5, sort_by: "date", sort_order: "desc" }),
      ]);
      setSummary(s);
      setRecentTxns(t.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !summary) {
    return (
      <div className="loading-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  const currency = user?.currency || "USD";
  const trendData = summary?.monthly_trend?.map((m) => ({
    name: m.month,
    Income: m.total_income,
    Expenses: m.total_expenses,
    Savings: m.net_savings,
  })) || [];

  const pieData = summary?.expenses_by_category?.slice(0, 6).map((c) => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    value: c.total,
  })) || [];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.full_name || user?.username} 👋
          </p>
        </div>
        <select
          className="form-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{ width: "auto" }}
          id="dashboard-period-select"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <p className="stat-label">Total Income</p>
            <CurrencyFormat
              amount={summary?.total_income || 0}
              currency={currency}
              className="stat-value text-income"
            />
            <p className="stat-sub">{summary?.transaction_count || 0} transactions</p>
          </div>
          <div className="stat-icon" style={{ background: "var(--green-dim)" }}>
            <TrendingUp size={22} color="var(--green)" />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Total Expenses</p>
            <CurrencyFormat
              amount={summary?.total_expenses || 0}
              currency={currency}
              className="stat-value text-expense"
            />
            <p className="stat-sub">Avg {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(summary?.avg_daily_expense || 0)}/day</p>
          </div>
          <div className="stat-icon" style={{ background: "var(--red-dim)" }}>
            <TrendingDown size={22} color="var(--red)" />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Net Savings</p>
            <CurrencyFormat
              amount={summary?.net_savings || 0}
              currency={currency}
              className={`stat-value ${(summary?.net_savings || 0) >= 0 ? "text-income" : "text-expense"}`}
            />
            <p className="stat-sub">Savings rate: {summary?.savings_rate?.toFixed(1) || 0}%</p>
          </div>
          <div className="stat-icon" style={{ background: "var(--accent-dim)" }}>
            <Wallet size={22} color="var(--accent-hover)" />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Top Expense</p>
            <p className="stat-value" style={{ fontSize: "1.2rem", textTransform: "capitalize" }}>
              {summary?.top_expense_category || "—"}
            </p>
            <p className="stat-sub">Highest spending category</p>
          </div>
          <div className="stat-icon" style={{ background: "var(--yellow-dim)" }}>
            <Target size={22} color="var(--yellow)" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Area Chart */}
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "20px" }}>
            Cash Flow Trend
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#161d2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }}
              />
              <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "20px" }}>
            Expenses by Category
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#161d2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }}
                  formatter={(v) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v)}
                />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: "#94a3b8", fontSize: "12px" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>No expense data for this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Recent Transactions</h2>
          <a href="/transactions" className="btn btn-ghost btn-sm">View all →</a>
        </div>

        {recentTxns.length === 0 ? (
          <div className="empty-state" style={{ padding: "30px" }}>
            <p>No transactions yet. Add your first one!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td><span className="badge badge-category">{t.category}</span></td>
                    <td className="text-muted">{format(new Date(t.date), "MMM d, yyyy")}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {t.type === "income"
                          ? <ArrowUpRight size={14} color="var(--green)" />
                          : <ArrowDownRight size={14} color="var(--red)" />}
                        <span className={`badge badge-${t.type}`}>{t.type}</span>
                      </div>
                    </td>
                    <td className={`text-right font-mono font-bold text-${t.type === "income" ? "income" : "expense"}`}>
                      {t.type === "income" ? "+" : "-"}
                      {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
