// ============================================================
// AuthContext — global auth state
// FIX: restores the session on page load by reading the stored
// token and calling getMe(). Previously a refresh logged users out.
// ============================================================
import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true); // true until session check done

  // ---- Restore session on first load ----
  useEffect(() => {
    const token = localStorage.getItem("mentorToken");
    if (!token) { setBootstrapping(false); return; }
    authAPI.getMe()
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("mentorToken")) // bad/expired token
      .finally(() => setBootstrapping(false));
  }, []);

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

  // Used by reset-password to log straight in after a successful reset
  const setSession = (token, userObj) => {
    localStorage.setItem("mentorToken", token);
    setUser(userObj);
  };

  const loginWithGoogle = async (credential) => {
    setAuthLoading(true);
    try {
      const data = await authAPI.google(credential);
      localStorage.setItem("mentorToken", data.token);
      setUser(data.user);
      return { success: true, user: data.user };
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
    <AuthContext.Provider
      value={{ user, authLoading, bootstrapping, login, register, loginWithGoogle, logout, setSession, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
