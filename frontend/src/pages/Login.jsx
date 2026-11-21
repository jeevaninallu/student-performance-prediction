
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      // Login through AuthContext
      await login(
        formData.email.trim(),
        formData.password
      );

      alert("Login successful! Welcome back.");

      navigate("/prediction");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to log in. Please check your credentials.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Section */}
      <section className="auth-left">
        <div className="auth-form-wrapper">

          <div className="brand-logo">
            <GraduationCap size={34} />
            <span>
              STUDENT PERFORMANCE<br />
              PREDICTION SYSTEM
            </span>
          </div>

          <div className="welcome-section">
            <h1>Welcome Back!</h1>
            <p>Please enter your credentials to access your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={19} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={19} />
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="signup-error">{error}</p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
              {!loading && <ArrowRight size={18} />}
            </button>

          </form>

          <div className="signup-link">
            Don't have an account?{" "}
            <Link to="/signup">Create an Account</Link>
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <button type="button" className="google-button">
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
            />
            Continue with Google
          </button>

        </div>
      </section>

      {/* Right Section */}
      <section className="auth-right">
        <div className="right-content">

          <div className="right-decoration">
            <GraduationCap size={58} strokeWidth={1.3} />
          </div>

          <h2>Make Every Academic Decision Count.</h2>

          <p className="right-description">
            Empowering students and educators with intelligent insights,
            data-driven predictions, and meaningful academic analytics
            to support better learning outcomes.
          </p>

          <div className="motivational-content">
            <p>Understand Your Progress. Unlock Your Potential.</p>
            <p>Turn Academic Data Into Better Decisions.</p>
            <p>Predict Performance. Improve Outcomes.</p>
            <p>Every Student Deserves an Opportunity to Excel.</p>
          </div>

          <div className="right-footer">
            Intelligent Insights. Better Learning Outcomes.
          </div>

        </div>
      </section>
    </div>
  );
}

export default Login;
