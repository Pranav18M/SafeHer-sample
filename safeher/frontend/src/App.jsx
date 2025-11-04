import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionProvider } from './contexts/SessionContext';

// Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import Contacts from './components/Contacts/Contacts';
import StartSafety from './components/Safety/StartSafety';
import ActiveSession from './components/Safety/ActiveSession';
import AlertHistory from './components/Alerts/AlertHistory';
import Settings from './components/Settings/Settings';
import Navbar from './components/Layout/Navbar';
import LoadingSpinner from './components/Common/LoadingSpinner';

// PROTECTED ROUTE ✅
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return user ? children : <Navigate to="/login" />;
};

// PUBLIC ROUTE ✅
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return user ? <Navigate to="/dashboard" /> : children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
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

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </div>
  );
}

// ROOT COMPONENT
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