import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AdminUser } from '../../../api/client';
import { useCachedList } from '../../../hooks/useCachedList';
import { useAuth } from '../../../app/AuthContext';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge, roleLabel, roleVariant, statusVariant, statusLabel } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { SubPageLinks } from '../../../components/SubPageLinks';
import { FilterBar } from '../../../components/FilterBar';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /admin/akun — Daftar Akun (sub-halaman route per v0.10.4 / T10.5).
 * Tadinya tab='akun' di AkunPage monolith.
 *
 * - FilterBar untuk search
 * - PageMenu dengan primary action "Tambah" dan BUKA HALAMAN ke sub-pages
 */
export function AkunDaftarPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users, total, loading } = useCachedList<AdminUser>(
    () => api.adminGetUsers({ q: debouncedSearch || undefined, limit: 200 }),
    `/admin/users?q=${debouncedSearch}`,
    [debouncedSearch],
  );

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    try {
      const r = await api.adminCountPending();
      setPendingCount(r.count);
    } catch {}
  };

  return (
    <PageContainer size="xl">
      {/* Page header (title + PageMenu) */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Daftar Akun
          </h2>
          <p className="text-xs text-aam-text-muted">
            {users.length} dari {total} akun
          </p>
        </div>
        <PageMenu
          menuTitle="Menu Akun"
          actions={[
            {
              key: 'tambah',
              label: 'Tambah Akun',
              icon: 'add',
              variant: 'primary',
              onClick: () => navigate('/admin/akun/baru'),
            },
          ]}
          links={[
            {
              key: 'persetujuan',
              label: 'Persetujuan',
              path: '/admin/akun/persetujuan',
              icon: 'how_to_reg',
              badge: pendingCount > 0 ? pendingCount : undefined,
            },
            {
              key: 'sesi',
              label: 'Sesi Aktif',
              path: '/admin/akun/sesi',
              icon: 'devices',
            },
            {
              key: 'aktivitas',
              label: 'Aktivitas',
              path: '/admin/akun/aktivitas',
              icon: 'history',
            },
          ]}
        />
      </div>

      {/* SubPageLinks — desktop navigation to sibling sub-pages (v0.12.0) */}
      <SubPageLinks
        links={[
          { key: 'persetujuan', label: 'Persetujuan', path: '/admin/akun/persetujuan', icon: 'how_to_reg', badge: pendingCount > 0 ? pendingCount : undefined },
          { key: 'sesi', label: 'Sesi Aktif', path: '/admin/akun/sesi', icon: 'devices' },
          { key: 'aktivitas', label: 'Aktivitas', path: '/admin/akun/aktivitas', icon: 'history' },
        ]}
      />

      {/* FilterBar (search) */}
      <div className="mb-4">
        <FilterBar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Cari nama atau email...',
          }}
          filters={[]}
          values={{}}
          onChange={() => {}}
        />
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
              <th className="pb-2 font-medium">Nama</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Peran</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Google</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={6}><TableSkeleton rows={4} cols={5} /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon="person_off" message="Tidak ada akun ditemukan" /></td></tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => navigate(`/admin/akun/${u.id}`)}
                  className="border-b border-aam-border/50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-aam-green flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-aam-text">{u.name}</span>
                      {u.id === currentUser?.id && (
                        <Badge variant="gray">Anda</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-aam-text-muted">{u.email}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant={roleVariant(r)}>{roleLabel(r)}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge variant={statusVariant(u.status)}>{statusLabel(u.status)}</Badge>
                  </td>
                  <td className="py-3">
                    {u.googleLinked ? (
                      <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.125rem' }}>link</span>
                    ) : (
                      <span className="text-aam-text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>chevron_right</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : users.length === 0 ? (
          <EmptyState icon="person_off" message="Tidak ada akun ditemukan" />
        ) : (
          users.map((u) => (
            <Card
              key={u.id}
              icon="person"
              onClick={() => navigate(`/admin/akun/${u.id}`)}
              className="p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-aam-green flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-aam-text truncate">{u.name}</p>
                  <p className="text-xs text-aam-text-muted truncate">{u.email}</p>
                </div>
                {u.id === currentUser?.id && <Badge variant="gray">Anda</Badge>}
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                {u.roles.map((r) => (
                  <Badge key={r} variant={roleVariant(r)}>{roleLabel(r)}</Badge>
                ))}
                <Badge variant={statusVariant(u.status)}>{statusLabel(u.status)}</Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
