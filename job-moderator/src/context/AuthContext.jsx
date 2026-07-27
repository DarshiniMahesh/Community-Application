import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("jm_token"));

  const setToken = useCallback((t) => {
    if (t) {
      localStorage.setItem("jm_token", t);
    } else {
      localStorage.removeItem("jm_token");
    }
    setTokenState(t);
  }, []);

  const logout = useCallback(() => setToken(null), [setToken]);

  return (
    <AuthContext.Provider value={{ token, setToken, isAuthenticated: !!token, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
