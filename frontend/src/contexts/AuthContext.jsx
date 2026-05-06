import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, usersApi, setTokens, clearTokens, getAccessToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const me = await usersApi.getMe();
      setUser(me);
    } catch {
      setUser(null);
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getAccessToken()) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    setTokens(data.access_token, data.refresh_token);
    const me = await usersApi.getMe();
    setUser(me);
    return me;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearTokens();
    setUser(null);
  };

  const updateUser = (updated) => setUser((prev) => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
