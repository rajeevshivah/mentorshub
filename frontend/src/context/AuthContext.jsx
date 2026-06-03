// ============================================================
// AuthContext — Global user authentication state
// Wrap entire app so any component can access user info
// ============================================================
import { createContext, useContext, useState } from "react";
import { authAPI } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      const data = await authAPI.login({ email, password });
      localStorage.setItem("mentorToken", data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (name, email, password, phone) => {
    setAuthLoading(true);
    try {
      const data = await authAPI.register({ name, email, password, phone });
      localStorage.setItem("mentorToken", data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("mentorToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this in any component
export const useAuth = () => useContext(AuthContext);