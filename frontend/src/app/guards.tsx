import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { SafeUser, UserRole } from '../api/client';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-aam-page">
        <span className="material-symbols-outlined animate-spin text-aam-green" style={{ fontSize: '2rem' }}>
          progress_activity
        </span>
      </div>
    );
  }

  if (!user) {
    // Save return-to
    sessionStorage.setItem('aamapp_return_to', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // admin passes all
  if (user.roles.includes('admin')) return <>{children}</>;

  const hasRole = roles.some((r) => user.roles.includes(r));
  if (!hasRole) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '3rem' }}>
          lock
        </span>
        <p className="mt-3 text-sm text-aam-text-muted">
          Anda tidak memiliki akses ke halaman ini
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
