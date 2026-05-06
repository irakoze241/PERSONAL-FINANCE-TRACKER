import { useEffect, useState, useCallback } from "react";
import { transactionsApi } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Pencil, Trash2, Search, SlidersHorizontal, X } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

const CATEGORIES = [
  "food","transport","housing","entertainment","health",
  "education","shopping","utilities","savings","investment",
  "salary","freelance","other"
];

const emptyForm = {
  title: "", amount: "", type: "expense", category: "other",
  date: new Date().toISOString().split("T")[0],
  description: "", tags: "", is_recurring: false, recurrence_interval: ""
};

function TransactionModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type: t, checked } = e.target;
    setForm((f) => ({ ...f, [name]: t === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category,
        date: new Date(form.date).toISOString(),
        description: form.description || undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        is_recurring: form.is_recurring,
        recurrence_interval: form.is_recurring && form.recurrence_interval ? form.recurrence_interval : undefined,
      };
      if (initial?.id) {
        await transactionsApi.update(initial.id, payload);
        toast.success("Transaction updated");
      } else {
        await transactionsApi.create(payload);
        toast.success("Transaction added");
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
          <h2 className="modal-title">{initial?.id ? "Edit" : "Add"} Transaction</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="txn-title">Title</label>
            <input id="txn-title" name="title" className="form-input" placeholder="e.g. Lunch at café"
              value={form.title} onChange={handleChange} required />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="txn-amount">Amount</label>
              <input id="txn-amount" name="amount" type="number" min="0.01" step="0.01" className="form-input"
                placeholder="0.00" value={form.amount} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="txn-type">Type</label>
              <select id="txn-type" name="type" className="form-select" value={form.type} onChange={handleChange}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="txn-category">Category</label>
              <select id="txn-category" name="category" className="form-select" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="txn-date">Date</label>
              <input id="txn-date" name="date" type="date" className="form-input"
                value={form.date} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="txn-description">Description (optional)</label>
            <textarea id="txn-description" name="description" className="form-textarea"
              placeholder="Add a note…" value={form.description} onChange={handleChange} rows={2} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="txn-tags">Tags (comma-separated)</label>
            <input id="txn-tags" name="tags" className="form-input" placeholder="e.g. work, travel"
              value={form.tags} onChange={handleChange} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input id="txn-recurring" name="is_recurring" type="checkbox"
              checked={form.is_recurring} onChange={handleChange}
              style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
            <label htmlFor="txn-recurring" className="form-label" style={{ cursor: "pointer", marginBottom: 0 }}>
              Recurring transaction
            </label>
          </div>

          {form.is_recurring && (
            <div className="form-group">
              <label className="form-label" htmlFor="txn-interval">Interval</label>
              <select id="txn-interval" name="recurrence_interval" className="form-select"
                value={form.recurrence_interval} onChange={handleChange}>
                <option value="">Select…</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button type="button" className="btn btn-secondary w-full" onClick={onClose} style={{ justifyContent: "center" }}>Cancel</button>
            <button id="txn-save-btn" type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: "center" }}>
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [data, setData] = useState({ items: [], total: 0, page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTxn, setEditTxn] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "", type: "", category: "", sort_by: "date", sort_order: "desc", page: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionsApi.list({ ...filters, page_size: 15 });
      setData(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await transactionsApi.delete(id);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openEdit = (txn) => {
    setEditTxn({
      ...txn,
      date: new Date(txn.date).toISOString().split("T")[0],
      tags: txn.tags?.join(", ") || "",
    });
    setShowModal(true);
  };

  const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">{data.total} total records</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" id="toggle-filters-btn"
            onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={16} /> Filters
          </button>
          <button className="btn btn-primary" id="add-transaction-btn"
            onClick={() => { setEditTxn(null); setShowModal(true); }}>
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "12px", alignItems: "end" }}>
            <div className="form-group">
              <label className="form-label">Search</label>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input className="form-input" placeholder="Search transactions…" style={{ paddingLeft: "34px" }}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}>
                <option value="">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}>
                <option value="">All</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sort By</label>
              <select className="form-select" value={filters.sort_by}
                onChange={(e) => setFilters({ ...filters, sort_by: e.target.value, page: 1 })}>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="title">Title</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Order</label>
              <select className="form-select" value={filters.sort_order}
                onChange={(e) => setFilters({ ...filters, sort_order: e.target.value, page: 1 })}>
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="loading-spinner" /></div>
        ) : data.items.length === 0 ? (
          <div className="empty-state">
            <p>No transactions found. Start by adding one!</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Tags</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{t.title}</div>
                        {t.description && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t.description}</div>}
                        {t.is_recurring && (
                          <span style={{ fontSize: "0.7rem", color: "var(--purple)", marginTop: 2, display: "block" }}>
                            🔁 {t.recurrence_interval}
                          </span>
                        )}
                      </td>
                      <td><span className="badge badge-category">{t.category}</span></td>
                      <td className="text-muted">{format(new Date(t.date), "MMM d, yyyy")}</td>
                      <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {t.tags?.map((tag) => (
                            <span key={tag} style={{
                              background: "var(--bg-input)", border: "1px solid var(--border)",
                              borderRadius: "100px", padding: "2px 8px", fontSize: "0.7rem",
                              color: "var(--text-secondary)"
                            }}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className={`text-right font-mono font-bold text-${t.type === "income" ? "income" : "expense"}`}>
                        {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                      </td>
                      <td className="text-right">
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 }}>
                <button className="btn btn-secondary btn-sm" disabled={!data.has_prev}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>← Prev</button>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Page {data.page} of {data.total_pages}
                </span>
                <button className="btn btn-secondary btn-sm" disabled={!data.has_next}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <TransactionModal
          initial={editTxn}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
