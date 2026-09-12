import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'arohak_auth';

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null); // { token, user }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setAuth(parsed);
        // Verify token is still valid / refresh user info in background.
        api
          .me(parsed.token)
          .then(({ user }) => setAuth({ token: parsed.token, user }))
          .catch(() => {
            localStorage.removeItem(STORAGE_KEY);
            setAuth(null);
          })
          .finally(() => setLoading(false));
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    setAuth(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.register(payload);
    setAuth(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: auth?.user || null,
        token: auth?.token || null,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
