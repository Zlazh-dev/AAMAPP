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

// Cermin kontrak RequireRole di App.tsx — cukup kasar untuk UX;
// penegakan sesungguhnya tetap di RequireRole.
const AREA_ACCESS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/kurikulum', roles: ['kurikulum', 'admin'] },
  { prefix: '/kesiswaan', roles: ['kesiswaan', 'admin', 'kepsek'] },
  { prefix: '/tu', roles: ['tu', 'admin', 'kepsek', 'kesiswaan'] },
  { prefix: '/guru', roles: ['guru'] },
  { prefix: '/izin/guru', roles: ['guru'] },
  { prefix: '/kokurikuler', roles: ['guru', 'admin', 'kesiswaan'] },
  { prefix: '/ekskul', roles: ['guru', 'admin', 'kesiswaan'] },
  { prefix: '/kepsek', roles: ['kepsek'] },
];

function isReturnToAllowed(path: string, u: SafeUser): boolean {
  // wajib path internal: tepat satu '/' di awal ('//evil.com' = open redirect)
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  const area = AREA_ACCESS.find(
    (a) => path === a.prefix || path.startsWith(a.prefix + '/'),
  );
  if (!area) return true; // /profil dll — auth-only
  return u.roles.some((r) => area.roles.includes(r));
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
    const returnTo = getAndClearReturnTo();
    if (returnTo && returnTo !== '/' && isReturnToAllowed(returnTo, u)) {
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
    getAndClearReturnTo(); // buang return-to sisa sesi lama (#4)
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
