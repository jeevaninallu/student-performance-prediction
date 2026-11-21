import { NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Header() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="main-header">
      <div className="header-brand">
        <GraduationCap size={28} />
        <span>Student Performance Prediction</span>
      </div>

      <nav className="header-nav">
        <NavLink to="/prediction">Prediction</NavLink>
        <NavLink to="/history">Prediction History</NavLink>
        <NavLink to="/analytics">Analytics</NavLink>

        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={17} />
          Logout
        </button>
      </nav>
    </header>
  );
}

export default Header;