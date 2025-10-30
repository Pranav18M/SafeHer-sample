import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SessionProvider } from "./contexts/SessionContext";

// Components
import Login from "./components/Auth/Login";
import Register from "./Components/Auth/Register";
import Dashboard from "./Components/Dashboard/Dashboard";
import Contacts from "./Components/Contacts/Contacts";
import StartSafety from "./Components/Safety/StartSafety";
import ActiveSession from "./Components/Safety/ActiveSession";
import AlertHistory from "./Components/Alerts/AlertHistory";
import Settings from "./Components/Settings/Settings";
import Navbar from "./Components/Layout/Navbar";
import LoadingSpinner from "./Components/Common/LoadingSpinner";

// ✅ Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return user ? children : <Navigate to="/login" replace />;
};

// ✅ Public Route Wrapper
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return user ? <Navigate to="/dashboard" replace /> : children;
};

// ✅ All App Routes
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Show navbar only when logged in */}
      {user && <Navbar />}

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/start-safety"
          element={
            <ProtectedRoute>
              <StartSafety />
            </ProtectedRoute>
          }
        />
        <Route
          path="/active-session"
          element={
            <ProtectedRoute>
              <ActiveSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <AlertHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Redirect Root → Dashboard if logged in */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch-all 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

// ✅ Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
