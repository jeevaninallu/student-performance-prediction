
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Prediction from "./pages/Prediction";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext.jsx";

import "./App.css";

function MainLayout() {
  return (
    <>
      <Header />
      <main className="main-page">
        <Outlet />
      </main>
    </>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return <div className="auth-loading">Checking your session...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/prediction" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public pages */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* Protected pages */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/history" element={<History />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
