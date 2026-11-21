
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, User, Mail, Lock, ArrowRight } from "lucide-react";
import { useState } from "react";
import api from "../services/api";
import "./Login.css";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    const passwordPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordPattern.test(formData.password)) {
      setError(
        "Password must contain at least 8 characters, including uppercase, lowercase, number and special character."
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data.success) {
        alert("Account created successfully! Please log in.");
        navigate("/login");
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">

      {/* Left Section */}
      <section className="auth-left">
        <div className="auth-form-wrapper signup-wrapper">

          <div className="brand-logo">
            <GraduationCap size={34} />
            <span>
              STUDENT PERFORMANCE<br />
              PREDICTION SYSTEM
            </span>
          </div>

          <div className="welcome-section signup-heading">
            <h1>Create Account</h1>
            <p>Join us and take a smarter approach to your academic journey.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">

            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrapper">
                <User size={19} />
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signupEmail">Email Address</label>
              <div className="input-wrapper">
                <Mail size={19} />
                <input
                  type="email"
                  id="signupEmail"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signupPassword">Create Password</label>
              <div className="input-wrapper">
                <Lock size={19} />
                <input
                  type="password"
                  id="signupPassword"
                  name="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={19} />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {error && <p className="signup-error">{error}</p>}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
              {!loading && <ArrowRight size={18} />}
            </button>

          </form>

          <div className="signup-link">
            Already have an account? <Link to="/login">Login</Link>
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

          <h2>Your Academic Journey Starts Here.</h2>

          <p className="right-description">
            Create your account and explore intelligent academic
            predictions, personalized performance insights, and
            meaningful analytics designed to support your growth.
          </p>

          <div className="motivational-content">
            <p>Every Great Journey Begins With a Step.</p>
            <p>Discover Your Academic Potential.</p>
            <p>Make Your Progress Count.</p>
            <p>Learn Better. Grow Further. Achieve More.</p>
          </div>

          <div className="right-footer">
            Intelligent Insights. Better Learning Outcomes.
          </div>

        </div>
      </section>

    </div>
  );
}

export default Signup;
