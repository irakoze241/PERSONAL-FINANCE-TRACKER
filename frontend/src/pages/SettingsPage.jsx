import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usersApi } from "../api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { User, Lock, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    currency: user?.currency || "USD",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const updated = await usersApi.updateMe(profileForm);
      updateUser(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.username) {
      toast.error(`Type your username "${user?.username}" to confirm`);
      return;
    }
    try {
      await usersApi.deleteMe();
      await logout();
      toast.success("Account deleted");
      navigate("/login");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account preferences</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, background: "var(--accent-dim)",
            borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <User size={20} color="var(--accent-hover)" />
          </div>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Profile Information</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>@{user?.username}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="settings-fullname">Full Name</label>
            <input id="settings-fullname" type="text" className="form-input"
              placeholder="Your full name"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="settings-email">Email</label>
              <input id="settings-email" type="email" className="form-input"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-currency">Default Currency</label>
              <select id="settings-currency" className="form-select"
                value={profileForm.currency}
                onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="GHS">GHS (₵)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="KES">KES (KSh)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>
          <button id="settings-save-btn" type="submit" className="btn btn-primary"
            disabled={profileLoading} style={{ alignSelf: "flex-start" }}>
            {profileLoading ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, background: "var(--accent-dim)",
            borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Lock size={20} color="var(--accent-hover)" />
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Account Information</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Username", value: user?.username },
            { label: "Member Since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{label}</span>
              <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, background: "var(--red-dim)",
            borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Trash2 size={20} color="var(--red)" />
          </div>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--red)" }}>Danger Zone</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>This action is irreversible</p>
          </div>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 14 }}>
          Deleting your account will permanently remove all your transactions, budgets, and data.
          Type your username <strong style={{ color: "var(--text-primary)" }}>{user?.username}</strong> to confirm.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            id="delete-confirm-input"
            className="form-input"
            placeholder={`Type "${user?.username}" to confirm`}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
          <button id="delete-account-btn" className="btn btn-danger"
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== user?.username}
            style={{ whiteSpace: "nowrap" }}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
