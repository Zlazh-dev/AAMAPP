import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AdminUser , ApiError } from '../../../api/client';
import { useCachedList } from '../../../hooks/useCachedList';
import { useAuth } from '../../../app/AuthContext';
import { Badge, roleLabel, roleVariant, statusVariant, statusLabel } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { SubPageLayout } from '../../../components/SubPageLinks';
import { FilterBar } from '../../../components/FilterBar';
import { PageContainer } from '../../../components/PageContainer';
import { Table, ColumnDef } from '../../../components/Table';
import { Pagination } from '../../../components/Pagination';

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
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users, total, loading } = useCachedList<AdminUser>(
    () => api.adminGetUsers({ q: debouncedSearch || undefined, page, limit: 25 }),
    `/admin/users?q=${debouncedSearch}&p=${page}`,
    [debouncedSearch, page],
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

      <SubPageLayout
        links={[
          { key: 'persetujuan', label: 'Persetujuan', path: '/admin/akun/persetujuan', icon: 'how_to_reg', badge: pendingCount > 0 ? pendingCount : undefined, description: 'Antrean akun menunggu' },
          { key: 'sesi', label: 'Sesi Aktif', path: '/admin/akun/sesi', icon: 'devices', description: 'Perangkat yg sedang login' },
          { key: 'aktivitas', label: 'Aktivitas', path: '/admin/akun/aktivitas', icon: 'history', description: 'Log aktivitas akun' },
        ]}
      >

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

      {loading ? <TableSkeleton rows={4} cols={5} /> : (
        <>
        <Table<AdminUser>
          columns={[
            {
              header: 'Nama',
              cell: (u) => (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-aam-green flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-aam-text">{u.name}</span>
                  {u.id === currentUser?.id && <Badge variant="gray">Anda</Badge>}
                </div>
              ),
            },
            {
              header: 'Email',
              cell: (u) => <span className="text-aam-text-muted">{u.email}</span>,
            },
            {
              header: 'Peran',
              cell: (u) => (
                <div className="flex flex-wrap gap-1">
                  {u.roles.map((r) => <Badge key={r} variant={roleVariant(r)}>{roleLabel(r)}</Badge>)}
                </div>
              ),
            },
            {
              header: 'Status',
              cell: (u) => <Badge variant={statusVariant(u.status)}>{statusLabel(u.status)}</Badge>,
            },
            {
              header: 'Google',
              cell: (u) => u.googleLinked
                ? <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.125rem' }}>link</span>
                : <span className="text-aam-text-muted text-xs">—</span>,
            },
            {
              header: '',
              width: 'w-8',
              cell: () => <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>chevron_right</span>,
            },
          ] satisfies ColumnDef<AdminUser>[]}
          data={users}
          rowKey={(u) => u.id}
          emptyMessage="Tidak ada akun ditemukan"
          onRowClick={(u) => navigate(`/admin/akun/${u.id}`)}
        />
        <Pagination page={page} limit={25} total={total} onPageChange={setPage} loading={loading} />
        </>
      )}
      </SubPageLayout>
    </PageContainer>
  );
}
