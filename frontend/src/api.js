const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getAccessToken = () => localStorage.getItem("access_token");
export const getRefreshToken = () => localStorage.getItem("refresh_token");
export const setTokens = (access, refresh) => {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
};
export const clearTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

// ── Base fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Try refresh on 401
  if (res.status === 401 && getRefreshToken()) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: getRefreshToken() }),
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setTokens(data.access_token, data.refresh_token);
      headers["Authorization"] = `Bearer ${data.access_token}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else {
      clearTokens();
      window.location.href = "/login";
      return;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),
  refresh: (refresh_token) =>
    apiFetch("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token }) }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: () => apiFetch("/users/me"),
  updateMe: (data) =>
    apiFetch("/users/me", { method: "PUT", body: JSON.stringify(data) }),
  deleteMe: () => apiFetch("/users/me", { method: "DELETE" }),
};

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
    ).toString();
    return apiFetch(`/transactions${q ? `?${q}` : ""}`);
  },
  get: (id) => apiFetch(`/transactions/${id}`),
  create: (data) =>
    apiFetch("/transactions", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    apiFetch(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/transactions/${id}`, { method: "DELETE" }),
};

// ── Budgets ───────────────────────────────────────────────────────────────────
export const budgetsApi = {
  list: () => apiFetch("/budgets"),
  get: (id) => apiFetch(`/budgets/${id}`),
  create: (data) =>
    apiFetch("/budgets", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    apiFetch(`/budgets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/budgets/${id}`, { method: "DELETE" }),
};

// ── Summary ───────────────────────────────────────────────────────────────────
export const summaryApi = {
  get: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
    ).toString();
    return apiFetch(`/summary${q ? `?${q}` : ""}`);
  },
};
