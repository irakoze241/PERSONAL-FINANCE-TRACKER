import { useEffect, useState, useCallback } from "react";
import { budgetsApi } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = [
  "food","transport","housing","entertainment","health",
  "education","shopping","utilities","savings","investment",
  "salary","freelance","other"
];

const emptyForm = { category: "food", limit: "", period: "monthly", alert_threshold: 80 };

function BudgetModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        category: form.category,
        limit: parseFloat(form.limit),
        period: form.period,
        alert_threshold: parseFloat(form.alert_threshold),
      };
      if (initial?.id) {
        await budgetsApi.update(initial.id, { limit: payload.limit, period: payload.period, alert_threshold: payload.alert_threshold });
        toast.success("Budget updated");
      } else {
        await budgetsApi.create(payload);
        toast.success("Budget created");
      }
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{initial?.id ? "Edit" : "Set"} Budget</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {!initial?.id && (
            <div className="form-group">
              <label className="form-label" htmlFor="budget-category">Category</label>
              <select id="budget-category" name="category" className="form-select" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="budget-limit">Spending Limit</label>
              <input id="budget-limit" name="limit" type="number" min="1" step="0.01" className="form-input"
                placeholder="500.00" value={form.limit} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="budget-period">Period</label>
              <select id="budget-period" name="period" className="form-select" value={form.period} onChange={handleChange}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="budget-threshold">
              Alert Threshold: {form.alert_threshold}%
            </label>
            <input id="budget-threshold" name="alert_threshold" type="range" min="0" max="100" step="5"
              value={form.alert_threshold} onChange={handleChange}
              style={{ width: "100%", accentColor: "var(--accent)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>0%</span><span>Alert at {form.alert_threshold}% used</span><span>100%</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button type="button" className="btn btn-secondary w-full" onClick={onClose} style={{ justifyContent: "center" }}>Cancel</button>
            <button id="budget-save-btn" type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: "center" }}>
              {loading ? "Saving…" : "Save Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BudgetCard({ budget, currency, onEdit, onDelete }) {
  const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  const pct = budget.percentage_used;
  const isAlert = pct >= budget.alert_threshold && !budget.is_exceeded;
  const barColor = budget.is_exceeded ? "var(--red)" : isAlert ? "var(--yellow)" : "var(--green)";

  return (
    <div className="card" style={{ position: "relative" }}>
      {budget.is_exceeded && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "100px", padding: "3px 10px",
          fontSize: "0.7rem", fontWeight: 600, color: "var(--red)",
          display: "flex", alignItems: "center", gap: 4
        }}>
          <AlertTriangle size={11} /> Exceeded
        </div>
      )}
      {isAlert && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "var(--yellow-dim)", border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "100px", padding: "3px 10px",
          fontSize: "0.7rem", fontWeight: 600, color: "var(--yellow)",
          display: "flex", alignItems: "center", gap: 4
        }}>
          <AlertTriangle size={11} /> Alert
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontWeight: 700, textTransform: "capitalize", marginBottom: 2 }}>{budget.category}</h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
            {budget.period} budget
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(budget)} title="Edit"><Pencil size={14} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(budget.id)} title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {fmt(budget.spent)} spent
          </span>
          <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar"
            style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {fmt(budget.remaining)} remaining
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Limit: {fmt(budget.limit)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBudget, setEditBudget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await budgetsApi.list();
      setBudgets(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this budget?")) return;
    try {
      await budgetsApi.delete(id);
      toast.success("Budget deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openEdit = (b) => {
    setEditBudget(b);
    setShowModal(true);
  };

  const exceeded = budgets.filter((b) => b.is_exceeded).length;
  const alerting = budgets.filter((b) => !b.is_exceeded && b.percentage_used >= b.alert_threshold).length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-subtitle">
            {budgets.length} budgets
            {exceeded > 0 ? <span style={{ color: "var(--red)" }}> · {exceeded} exceeded</span> : null}
            {alerting > 0 ? <span style={{ color: "var(--yellow)" }}> · {alerting} near limit</span> : null}
          </p>
        </div>
        <button className="btn btn-primary" id="add-budget-btn"
          onClick={() => { setEditBudget(null); setShowModal(true); }}>
          <Plus size={16} /> Set Budget
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="loading-spinner" /></div>
      ) : budgets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>No budgets yet. Set one to start tracking your spending!</p>
          </div>
        </div>
      ) : (
        <div className="budget-grid">
          {budgets.map((b) => (
            <BudgetCard key={b.id} budget={b} currency={currency}
              onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <BudgetModal
          initial={editBudget}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
