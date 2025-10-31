// src/contexts/SessionContext.jsx
import React, { createContext, useContext, useState } from "react";

const SessionContext = createContext();

// ✅ Context Provider
export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null); // store active session details
  const [isActive, setIsActive] = useState(false);

  const startSession = (sessionData) => {
    setSession(sessionData);
    setIsActive(true);
  };

  const endSession = () => {
    setSession(null);
    setIsActive(false);
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        isActive,
        startSession,
        endSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

// ✅ Custom Hook (this fixes your error)
export const useSession = () => {
  return useContext(SessionContext);
};
