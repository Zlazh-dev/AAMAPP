import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from '../api/client';
import { getHomePath } from './menu';

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

  // Cacat #1 DICABUT: "admin passes all" membocorkan rute guru-only ke admin.
  // Kelonggaran admin kini EKSPLISIT per-rute di App.tsx.

  const hasRole = roles.some((r) => user.roles.includes(r));
  if (!hasRole) {
    // Cacat #2: layar gembok statis diganti Navigate ke home peran.
    return <Navigate to={getHomePath(user)} replace />;
  }

  return <>{children}</>;
}
