import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import BudgetsPage from "./pages/BudgetsPage";
import SummaryPage from "./pages/SummaryPage";
import SettingsPage from "./pages/SettingsPage";

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function GuestLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#161d2e",
              color: "#f1f5f9",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              fontSize: "0.875rem",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#161d2e" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#161d2e" } },
          }}
        />
        <Routes>
          {/* Guest routes */}
          <Route element={<GuestLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
