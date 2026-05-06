import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowUpDown, PiggyBank, BarChart3,
  LogOut, Settings, TrendingUp
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: ArrowUpDown, label: "Transactions" },
  { to: "/budgets", icon: PiggyBank, label: "Budgets" },
  { to: "/summary", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  };

  const initial = user?.username?.[0]?.toUpperCase() || "U";

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <TrendingUp size={18} color="white" />
        </div>
        <span>FinTrack</span>
      </div>

      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}

      <div className="sidebar-spacer" />

      <div className="sidebar-user">
        <div className="user-avatar">{initial}</div>
        <div className="user-info">
          <div className="user-name">{user?.username}</div>
          <div className="user-email">{user?.email}</div>
        </div>
      </div>

      <button className="nav-item" onClick={handleLogout} id="sidebar-logout-btn">
        <LogOut size={18} />
        Logout
      </button>
    </nav>
  );
}
