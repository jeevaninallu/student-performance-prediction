
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const restorationStarted = useRef(false);

  useEffect(() => {
    if (restorationStarted.current) return;
    restorationStarted.current = true;

    const restoreSession = async () => {
      try {
        const refreshResponse = await api.post("/auth/refresh");
        const newAccessToken = refreshResponse.data.accessToken;

        const profileResponse = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${newAccessToken}`,
          },
        });

        setAccessToken(newAccessToken);
        setUser(profileResponse.data.user);
      } catch (error) {
        setAccessToken(null);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Existing email/password login
  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    setAccessToken(response.data.accessToken);
    setUser(response.data.user);

    return response.data;
  };

  // Existing Google ID-token login (preserved)
  const googleLogin = async (idToken, linkingPassword = "") => {
    const response = await api.post("/auth/google", {
      idToken,
      ...(linkingPassword ? { linkingPassword } : {}),
    });

    setAccessToken(response.data.accessToken);
    setUser(response.data.user);

    return response.data;
  };

  // New Google OAuth 2.0 authorization-code login
  const googleOAuthLogin = async (code) => {
    const response = await api.post(
      "/auth/google/oauth",
      { code },
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    // Save our application's access token and user
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);

    // Return complete response, including development demo token
    return response.data;
  };

  // Link an existing password-based account with Google
  const linkGoogleAccount = async (
    pendingGoogleLinkToken,
    linkingPassword
  ) => {
    const response = await api.post(
      "/auth/google/oauth/link",
      {
        pendingGoogleLinkToken,
        linkingPassword,
      },
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    setAccessToken(response.data.accessToken);
    setUser(response.data.user);

    return response.data;
  };

  // Existing logout
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        authLoading,
        isAuthenticated: Boolean(user && accessToken),
        login,
        googleLogin,
        googleOAuthLogin,
        linkGoogleAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
