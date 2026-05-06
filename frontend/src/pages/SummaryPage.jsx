import { useEffect, useState } from "react";
import { summaryApi } from "../api";
import { useAuth } from "../contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line
} from "recharts";

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#a855f7","#3b82f6","#ec4899","#14b8a6","#f97316","#06b6d4"];

export default function SummaryPage() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    setLoading(true);
    summaryApi.get({ period })
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  const monthlyData = summary?.monthly_trend?.map((m) => ({
    name: m.month,
    Income: m.total_income,
    Expenses: m.total_expenses,
    Savings: m.net_savings,
  })) || [];

  const expCatData = summary?.expenses_by_category?.slice(0, 8).map((c) => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    value: c.total,
    count: c.count,
    percentage: c.percentage,
  })) || [];

  const incCatData = summary?.income_by_category?.slice(0, 8).map((c) => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    value: c.total,
  })) || [];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Detailed financial insights</p>
        </div>
        <select className="form-select" value={period}
          onChange={(e) => setPeriod(e.target.value)} style={{ width: "auto" }}
          id="summary-period-select">
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Summary KPIs */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {[
          { label: "Total Income", value: fmt(summary?.total_income || 0), color: "var(--green)" },
          { label: "Total Expenses", value: fmt(summary?.total_expenses || 0), color: "var(--red)" },
          { label: "Net Savings", value: fmt(summary?.net_savings || 0), color: summary?.net_savings >= 0 ? "var(--green)" : "var(--red)" },
          { label: "Savings Rate", value: `${summary?.savings_rate?.toFixed(1) || 0}%`, color: "var(--accent-hover)" },
          { label: "Transactions", value: summary?.transaction_count || 0, color: "var(--text-primary)" },
          { label: "Daily Avg Spend", value: fmt(summary?.avg_daily_expense || 0), color: "var(--yellow)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div>
              <p className="stat-label">{label}</p>
              <p className="stat-value" style={{ color, fontSize: "1.4rem" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20 }}>Monthly Overview</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${currency === "USD" ? "$" : ""}${(v / 1000).toFixed(1)}k`} />
            <Tooltip
              contentStyle={{ background: "#161d2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }}
              formatter={(v) => fmt(v)}
            />
            <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: "12px" }}>{v}</span>} />
            <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Savings" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="charts-grid" style={{ marginBottom: 20 }}>
        {/* Expense Breakdown */}
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20 }}>Expense Breakdown</h2>
          {expCatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expCatData} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value">
                  {expCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#161d2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }}
                  formatter={(v, _, { payload }) => [`${fmt(v)} (${payload.percentage}%)`, payload.name]}
                />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: "#94a3b8", fontSize: "12px" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No expense data</p></div>}
        </div>

        {/* Income Breakdown */}
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20 }}>Income Sources</h2>
          {incCatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={incCatData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => fmt(v)} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: "#161d2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }}
                  formatter={(v) => fmt(v)}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No income data</p></div>}
        </div>
      </div>

      {/* Savings Trend Line Chart */}
      {monthlyData.length > 1 && (
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20 }}>Savings Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
              <Tooltip
                contentStyle={{ background: "#161d2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }}
                formatter={(v) => fmt(v)}
              />
              <Line type="monotone" dataKey="Savings" stroke="#6366f1" strokeWidth={2.5}
                dot={{ fill: "#6366f1", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Expense Categories Table */}
      {expCatData.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20 }}>Top Expense Categories</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Transactions</th>
                  <th>% of Expenses</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {expCatData.map((c, i) => (
                  <tr key={c.name}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                        {c.name}
                      </div>
                    </td>
                    <td>{c.count}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="progress-bar-wrap" style={{ flex: 1 }}>
                          <div className="progress-bar" style={{ width: `${c.percentage}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                        {c.percentage}%
                      </div>
                    </td>
                    <td className="text-right font-mono font-bold text-expense">{fmt(c.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
