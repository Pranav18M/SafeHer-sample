import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// ✅ Create Context
const SessionContext = createContext();

// ✅ Base API URL based on environment
const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"; // Use .env or fallback to localhost

// ✅ Provider Component
export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null); // Stores active session data
  const [isActive, setIsActive] = useState(false); // Boolean flag for active session

  // ✅ Start a new session (sends data to backend & saves in storage)
  const startSession = async (sessionData) => {
    try {
      // Call backend to create new session
      const response = await axios.post(
        `${API_BASE_URL}/api/session/start`,
        sessionData
      );

      if (response.data.success) {
        const newSession = response.data.session;

        // Update React state
        setSession(newSession);
        setIsActive(true);

        // Persist to localStorage
        localStorage.setItem("activeSession", JSON.stringify(newSession));
        console.log("✅ Session started and saved:", newSession);

        return { success: true };
      } else {
        console.error("❌ Backend error:", response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error("❌ Failed to start session:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  };

  // ✅ End current session and clear localStorage
  const endSession = () => {
    try {
      setSession(null);
      setIsActive(false);
      localStorage.removeItem("activeSession");
      console.log("✅ Session ended and removed from storage");
    } catch (error) {
      console.error("❌ Failed to end session:", error);
    }
  };

  // ✅ Check if there is an active session on component mount
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

  // ✅ Automatically check local storage on mount
  useEffect(() => {
    checkActiveSession();

    return () => {
      console.log("🧹 SessionProvider cleanup");
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        isActive,
        startSession,
        endSession,
        checkActiveSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

// ✅ Custom Hook to use Session Context
export const useSession = () => useContext(SessionContext);
