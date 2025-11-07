import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// ✅ Create Context
const SessionContext = createContext();

// ✅ Base API URL based on environment (.env or fallback)
const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// ✅ Provider Component
export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null); // Stores active session data
  const [isActive, setIsActive] = useState(false); // Boolean flag for active session
  const [loading, setLoading] = useState(false); // Loading state for async operations

  // ✅ Start a new session (sends data to backend & saves in localStorage)
  const startSession = async (sessionData) => {
    try {
      setLoading(true);
      console.log("🚀 Starting session with data:", sessionData);

      const response = await axios.post(
        `${API_BASE_URL}/api/session/start`,
        sessionData
      );

      if (response.data.success) {
        const newSession = response.data.session;

        // Save to state & localStorage
        setSession(newSession);
        setIsActive(true);
        localStorage.setItem("activeSession", JSON.stringify(newSession));

        console.log("✅ Session started successfully:", newSession);
        return { success: true };
      } else {
        console.error("❌ Backend returned error:", response.data.message);
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      console.error("❌ Failed to start session:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  // ✅ End current session (calls backend & clears local session)
  const endSession = async () => {
    try {
      if (!session?._id) {
        console.warn("⚠️ No active session to end.");
        return { success: false, message: "No active session to end." };
      }

      const response = await axios.post(`${API_BASE_URL}/api/session/end`, {
        sessionId: session._id,
      });

      if (response.data.success) {
        console.log("✅ Session ended on backend");

        // Clear session data
        setSession(null);
        setIsActive(false);
        localStorage.removeItem("activeSession");

        return { success: true };
      } else {
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      console.error("❌ Failed to end session:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  };

  // ✅ Restore session from localStorage (if any)
  const checkActiveSession = () => {
    try {
      const savedSession = JSON.parse(localStorage.getItem("activeSession"));
      if (savedSession) {
        setSession(savedSession);
        setIsActive(true);
        console.log("✅ Active session restored:", savedSession);
      }
    } catch (error) {
      console.error("⚠️ Error restoring session from storage:", error);
    }
  };

  // ✅ Trigger emergency alert to backend
  const triggerAlert = async (reason = "manual") => {
    try {
      if (!session?._id) {
        console.warn("⚠️ No active session found for alert.");
        return { success: false, message: "No active session found." };
      }

      console.log("🚨 Triggering alert for reason:", reason);

      const response = await axios.post(`${API_BASE_URL}/api/session/alert`, {
        sessionId: session._id,
        reason,
      });

      if (response.data.success) {
        console.log("✅ Alert sent successfully:", response.data);
        return { success: true };
      } else {
        console.error("❌ Backend alert error:", response.data.message);
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      console.error("❌ Failed to trigger alert:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  };

  // ✅ Auto-restore session on mount
  useEffect(() => {
    checkActiveSession();
    return () => console.log("🧹 SessionProvider cleanup");
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        isActive,
        loading,
        startSession,
        endSession,
        triggerAlert,
        checkActiveSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

// ✅ Custom Hook for using Session Context
export const useSession = () => useContext(SessionContext);
