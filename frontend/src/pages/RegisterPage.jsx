import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { TrendingUp } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "", email: "", password: "", full_name: "", currency: "USD"
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <TrendingUp size={22} color="white" />
          </div>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start tracking your finances today</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">Username</label>
              <input id="reg-username" name="username" type="text" className="form-input"
                placeholder="johndoe" value={form.username} onChange={handleChange} required minLength={3} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-currency">Currency</label>
              <select id="reg-currency" name="currency" className="form-select"
                value={form.currency} onChange={handleChange}>
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

          <div className="form-group">
            <label className="form-label" htmlFor="reg-fullname">Full Name (optional)</label>
            <input id="reg-fullname" name="full_name" type="text" className="form-input"
              placeholder="John Doe" value={form.full_name} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" name="email" type="email" className="form-input"
              placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input id="reg-password" name="password" type="password" className="form-input"
              placeholder="At least 6 characters" value={form.password} onChange={handleChange}
              required minLength={6} autoComplete="new-password" />
          </div>

          <button id="reg-submit-btn" type="submit" className="btn btn-primary btn-lg w-full"
            disabled={loading} style={{ justifyContent: "center", marginTop: "8px" }}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
