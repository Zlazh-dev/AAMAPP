import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  api,
  SafeUser,
  getToken,
  setToken,
  clearToken,
  getAndClearReturnTo,
} from '../api/client';
import { getHomePath } from './menu';

interface AuthContextValue {
  user: SafeUser | null;
  loading: boolean;
  login: (token: string, user: SafeUser) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      // Hanya hapus token bila masih SAMA dgn token yang dicek di awal
      // refresh() ini. Bila sudah berubah (mis. login baru menulis token
      // FRESH sementara request /me utk token LAMA ini masih berjalan &
      // baru gagal belakangan), jangan hapus token baru itu — race
      // ditemukan lewat e2e (E2E-ISOLASI-HARDENING): tanpa guard ini,
      // sesi baru bisa "hilang" secara acak tergantung timing jaringan.
      if (getToken() === token) {
        clearToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback((token: string, u: SafeUser) => {
    setToken(token);
    setUser(u);
    // redirect to return-to or role-based home
    const returnTo = getAndClearReturnTo();
    if (returnTo && returnTo !== '/') {
      window.location.href = returnTo;
    } else {
      window.location.href = getHomePath(u);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore — clear local regardless
    }
    clearToken();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
