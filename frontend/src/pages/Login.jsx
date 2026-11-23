
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const {
    login,
    googleOAuthLogin,
    linkGoogleAccount,
  } = useAuth();

  const googleButtonRef = useRef(null);

  const [googleReady, setGoogleReady] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Google account-linking states
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [linkingPassword, setLinkingPassword] = useState("");
  const [pendingGoogleToken, setPendingGoogleToken] = useState("");

  // Load Google Identity Services
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setError("Google Client ID is missing.");
      return;
    }

    let isMounted = true;

    const initializeGoogle = () => {
      if (!isMounted || !window.google?.accounts?.oauth2) {
        return;
      }

      setGoogleReady(true);
    };

    let script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.addEventListener("load", initializeGoogle);
      script.addEventListener("error", () => {
        if (isMounted) {
          setError("Unable to load Google authentication.");
        }
      });

      document.head.appendChild(script);
    } else if (window.google?.accounts?.oauth2) {
      initializeGoogle();
    } else {
      script.addEventListener("load", initializeGoogle);
    }

    return () => {
      isMounted = false;
      script?.removeEventListener("load", initializeGoogle);
    };
  }, []);

  // Handle Google OAuth authorization-code response
  const handleGoogleCodeResponse = async (response) => {
    if (response.error) {
      setError(
        response.error_description ||
        "Google authentication was cancelled or failed."
      );
      setLoading(false);
      return;
    }

    if (!response.code) {
      setError("Unable to receive Google authorization code.");
      setLoading(false);
      return;
    }

    try {
      setError("");
      setLoading(true);

      await googleOAuthLogin(response.code);

      alert("Google login successful! Welcome.");

      navigate("/prediction");
    } catch (err) {
      const responseData = err.response?.data;

      // Existing password-based account needs verification
      if (
        err.response?.status === 409 &&
        responseData?.requiresPasswordLink
      ) {
        setPendingGoogleToken(
          responseData.pendingGoogleLinkToken
        );

        setShowLinkPassword(true);
        setLinkingPassword("");
        setError("");
      } else {
        setError(
          responseData?.message ||
          "Google login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Start Google OAuth flow when the user clicks the button
  const handleGoogleLogin = () => {
    setError("");

    if (!window.google?.accounts?.oauth2) {
      setError("Google authentication is still loading. Please try again.");
      return;
    }

    if (loading) return;

    try {
      const codeClient =
        window.google.accounts.oauth2.initCodeClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "popup",

          callback: handleGoogleCodeResponse,

          error_callback: (errorResponse) => {
            setLoading(false);

            setError(
              errorResponse?.message ||
              "Unable to open Google authentication popup."
            );
          },
        });

      setLoading(true);

      // Opens Google's OAuth authorization popup
      codeClient.requestCode();
    } catch (err) {
      setLoading(false);
      setError("Unable to start Google authentication.");
    }
  };

  // Handle email/password input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  // Existing email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

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

  // Verify existing password and link Google account
  const handleGoogleLink = async (e) => {
    e.preventDefault();
    setError("");

    if (!linkingPassword.trim()) {
      setError("Please enter your existing account password.");
      return;
    }

    try {
      setLoading(true);

      await linkGoogleAccount(
        pendingGoogleToken,
        linkingPassword
      );

      setShowLinkPassword(false);
      setLinkingPassword("");
      setPendingGoogleToken("");

      alert("Google account linked successfully! Welcome.");

      navigate("/prediction");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to link your Google account. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel Google account linking
  const handleCancelGoogleLink = () => {
    setShowLinkPassword(false);
    setLinkingPassword("");
    setPendingGoogleToken("");
    setError("");
  };

  return (
    <div className="auth-container">

      {/* LEFT SECTION */}
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
            <p>
              Please enter your credentials to access your account.
            </p>
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

            {error && !showLinkPassword && (
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

          {/* GOOGLE OAUTH 2.0 BUTTON */}
          <div className="google-button-container">
            <button
              type="button"
              className="google-oauth-button"
              onClick={handleGoogleLogin}
              disabled={!googleReady || loading}
              ref={googleButtonRef}
            >
              {loading
                ? "Connecting to Google..."
                : "Continue with Google"}
            </button>
          </div>

          {/* EXISTING ACCOUNT PASSWORD VERIFICATION */}
          {showLinkPassword && (
            <div className="google-link-password">

              <h3>Link Your Google Account</h3>

              <p>
                An account with this Google email already exists.
                Enter your existing account password to securely
                link your Google account.
              </p>

              <form onSubmit={handleGoogleLink}>

                <div className="form-group">
                  <label htmlFor="linkingPassword">
                    Existing Account Password
                  </label>

                  <div className="input-wrapper">
                    <Lock size={19} />

                    <input
                      type="password"
                      id="linkingPassword"
                      name="linkingPassword"
                      placeholder="Enter your existing password"
                      value={linkingPassword}
                      onChange={(e) => {
                        setLinkingPassword(e.target.value);
                        setError("");
                      }}
                      autoComplete="current-password"
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
                  {loading ? "Verifying..." : "Verify & Continue"}

                  {!loading && <ArrowRight size={18} />}
                </button>

                <button
                  type="button"
                  className="google-link-cancel"
                  onClick={handleCancelGoogleLink}
                  disabled={loading}
                >
                  Cancel
                </button>

              </form>
            </div>
          )}

        </div>
      </section>

      {/* RIGHT SECTION */}
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
