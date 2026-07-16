import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getMenuForUser, findActiveLeaf, MenuItem } from './menu';
import { api } from '../api/client';
import { roleLabel, roleVariant, Badge } from '../components/Badge';

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [pendingCount, setPendingCount] = useState(0);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Live WIB clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch pending count for badge
  useEffect(() => {
    if (user?.roles.includes('admin')) {
      api.adminCountPending().then((r) => setPendingCount(r.count)).catch(() => {});
      const interval = setInterval(() => {
        api.adminCountPending().then((r) => setPendingCount(r.count)).catch(() => {});
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
    setAvatarOpen(false);
  }, [location.pathname]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const menuGroups = getMenuForUser(user);
  const wibTime = now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
  });
  const wibDate = now.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Cari leaf aktif untuk judul header. Kalau null → fallback "AAMAPP".
  const activeLeaf = findActiveLeaf(menuGroups, location.pathname);
  const currentTitle = activeLeaf?.label || 'AAMAPP';

  return (
    <div className="flex h-screen bg-aam-page">
      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed md:static inset-y-0 left-0 z-50 w-64 bg-aam-sidebar flex flex-col transition-transform duration-200',
          drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-aam-green flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '1.25rem' }}>
              school
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-white text-sm truncate">AAMAPP</p>
            <p className="text-[10px] text-white/50 truncate">SMP IT Asy-Syadzili</p>
          </div>
        </div>

        {/* Menu — SIDEBAR DATAR v0.12.0 */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {menuGroups.map((group) => (
            <div key={group.area} className="mb-4">
              <p className="px-3 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                {group.label}
              </p>
              {group.items.map((item) => (
                <SidebarRow
                  key={item.path}
                  item={item}
                  pathname={location.pathname}
                  pendingCount={pendingCount}
                />
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-aam-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile) */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden text-aam-text-muted hover:text-aam-text min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>menu</span>
            </button>
            <h1 className="text-base md:text-lg font-heading font-semibold text-aam-text">
              {currentTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* WIB clock */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-aam-text tabular-nums">{wibTime} WIB</span>
              <span className="text-[10px] text-aam-text-muted">{wibDate}</span>
            </div>

            {/* Role badges */}
            <div className="hidden md:flex items-center gap-1">
              {user.roles.map((r) => (
                <Badge key={r} variant={roleVariant(r)}>
                  {roleLabel(r)}
                </Badge>
              ))}
            </div>

            {/* Avatar dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                onClick={() => setAvatarOpen((v) => !v)}
                className="flex items-center gap-2 text-sm hover:bg-gray-100 rounded-md px-2 min-h-[44px] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-aam-green flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline text-aam-text font-medium max-w-[120px] truncate">
                  {user.name}
                </span>
                <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1rem' }}>
                  expand_more
                </span>
              </button>

              {avatarOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-md border border-aam-border shadow-lg py-1 animate-fade-in z-50">
                  <div className="px-3 py-2 border-b border-aam-border">
                    <p className="text-sm font-medium text-aam-text truncate">{user.name}</p>
                    <p className="text-xs text-aam-text-muted truncate">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/profil')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-aam-text hover:bg-gray-50 transition-colors min-h-[44px]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>person</span>
                    Profil
                  </button>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>logout</span>
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * SidebarRow — render satu item menu (SIDEBAR DATAR v0.12.0).
 * Semua item = NavLink sederhana, tanpa collapsible/children.
 */
function SidebarRow({
  item,
  pathname,
  pendingCount,
}: {
  item: MenuItem;
  pathname: string;
  pendingCount: number;
}) {
  const isDashboardRoot =
    item.path === '/admin' ||
    item.path === '/kurikulum' ||
    item.path === '/kesiswaan' ||
    item.path === '/guru' ||
    item.path === '/kepsek' ||
    item.path === '/tu';

  return (
    <NavLink
      to={item.path}
      end={isDashboardRoot}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors relative',
          isActive
            ? 'bg-aam-green/15 text-white border-l-2 border-aam-green'
            : 'text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent',
        ].join(' ')
      }
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badgeKey === 'pendingUsers' && pendingCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-aam-yellow text-[10px] font-bold text-yellow-900">
          {pendingCount}
        </span>
      )}
    </NavLink>
  );
}
