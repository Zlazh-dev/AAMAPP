import React, { useState, useEffect } from 'react';
import { api, ActivityLogEntry, ActivityLogResponse , ApiError } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { BackLink } from '../../../components/BackLink';
import { SubPageLayout } from '../../../components/SubPageLinks';
import { FilterBar, FilterValues } from '../../../components/FilterBar';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /admin/akun/aktivitas — Aktivitas (sub-halaman route per v0.10.4 / T10.5).
 *
 * - FilterBar untuk entity + action (mobile: bottom sheet)
 * - PageMenu dengan link ke sub-pages lain
 */
export function AkunAktivitasPage() {
  const { show } = useToast();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({ entity: '', action: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadActivities();
  }, [page, filters.entity, filters.action]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const r: ActivityLogResponse = await api.adminGetActivities({
        page,
        limit: 20,
        entity: filters.entity || undefined,
        action: filters.action || undefined,
      });
      setActivities(r.items);
      setMeta({ total: r.total, page: r.page, limit: r.limit });
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat aktivitas');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const handleFilterReset = () => {
    setFilters({ entity: '', action: '' });
    setPage(1);
  };

  const totalPages = Math.ceil(meta.total / meta.limit);

  return (
    <PageContainer size="xl" bottomBar>
      <BackLink to="/admin/akun" />
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Aktivitas
          </h2>
          <p className="text-xs text-aam-text-muted">
            {meta.total} entri tercatat
          </p>
        </div>
        <PageMenu
          menuTitle="Menu Aktivitas"
          links={[
            { key: 'daftar', label: 'Daftar Akun', path: '/admin/akun', icon: 'group' },
            {
              key: 'persetujuan',
              label: 'Persetujuan',
              path: '/admin/akun/persetujuan',
              icon: 'how_to_reg',
            },
            {
              key: 'sesi',
              label: 'Sesi Aktif',
              path: '/admin/akun/sesi',
              icon: 'devices',
            },
          ]}
        />
      </div>

      <SubPageLayout
        links={[
          { key: 'daftar', label: 'Daftar Akun', path: '/admin/akun', icon: 'group', description: 'Semua akun pengguna' },
          { key: 'persetujuan', label: 'Persetujuan', path: '/admin/akun/persetujuan', icon: 'how_to_reg', description: 'Antrean akun menunggu' },
          { key: 'sesi', label: 'Sesi Aktif', path: '/admin/akun/sesi', icon: 'devices', description: 'Perangkat yg sedang login' },
        ]}
      >

      {/* FilterBar */}
      <div className="mb-4">
        <FilterBar
          sheetTitle="Filter Aktivitas"
          filters={[
            {
              key: 'entity',
              label: 'Entitas',
              type: 'select',
              options: [
                { value: 'user', label: 'User' },
                { value: 'session', label: 'Session' },
              ],
            },
            {
              key: 'action',
              label: 'Aksi',
              type: 'select',
              options: [
                { value: 'login', label: 'Login' },
                { value: 'create', label: 'Create' },
                { value: 'update', label: 'Update' },
                { value: 'delete', label: 'Delete' },
                { value: 'approve', label: 'Approve' },
                { value: 'revoke', label: 'Revoke' },
              ],
            },
          ]}
          values={filters}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
        />
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
              <th className="pb-2 font-medium">Waktu</th>
              <th className="pb-2 font-medium">Pengguna</th>
              <th className="pb-2 font-medium">Aksi</th>
              <th className="pb-2 font-medium">Entitas</th>
              <th className="pb-2 font-medium">Ringkasan</th>
              <th className="pb-2 font-medium">Perangkat</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={6}><TableSkeleton rows={5} cols={5} /></td></tr>
            ) : activities.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon="history" message="Tidak ada aktivitas" /></td></tr>
            ) : (
              activities.map((a) => (
                <tr key={a.id} className="border-b border-aam-border/50">
                  <td className="py-2.5 text-xs text-aam-text-muted whitespace-nowrap" title={new Date(a.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}>
                    {new Date(a.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-2.5">
                    <p className="text-sm text-aam-text">{a.userName || '(dihapus)'}</p>
                    <p className="text-xs text-aam-text-muted">{a.userEmail}</p>
                  </td>
                  <td className="py-2.5">
                    <Badge variant={actionVariant(a.action)}>{a.action}</Badge>
                  </td>
                  <td className="py-2.5 text-aam-text-muted">{a.entity}{a.entityLabel ? `: ${a.entityLabel}` : ''}</td>
                  <td className="py-2.5 text-xs text-aam-text-muted max-w-xs truncate">{a.summary}</td>
                  <td className="py-2.5 text-xs text-aam-text-muted">{a.deviceSummary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : activities.length === 0 ? (
          <EmptyState icon="history" message="Tidak ada aktivitas" />
        ) : (
          activities.map((a) => (
            <Card key={a.id} icon="history">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-aam-text">{a.userName || '(dihapus)'}</span>
                <Badge variant={actionVariant(a.action)}>{a.action}</Badge>
              </div>
              <p className="text-xs text-aam-text-muted">{a.entity}: {a.entityLabel}</p>
              {a.summary && <p className="text-xs text-aam-text-muted mt-1">{a.summary}</p>}
              <p className="text-xs text-aam-text-muted mt-1">
                {new Date(a.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
              </p>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-aam-text-muted">
            {meta.total} total • hal {meta.page}/{totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
      </SubPageLayout>
    </PageContainer>
  );
}

function actionVariant(action: string): any {
  switch (action) {
    case 'login': return 'blue';
    case 'create': return 'green';
    case 'update': return 'yellow';
    case 'delete': return 'red';
    case 'approve': return 'green';
    case 'revoke': return 'red';
    default: return 'gray';
  }
}
