import React, { useState } from 'react';
import { api, SessionInfo , ApiError } from '../../../api/client';
import { useCachedList } from '../../../hooks/useCachedList';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { BackLink } from '../../../components/BackLink';
import { SubPageLayout } from '../../../components/SubPageLinks';
import { Pagination } from '../../../components/Pagination';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /admin/akun/sesi — Sesi Aktif (sub-halaman route per v0.10.4 / T10.5).
 */
export function AkunSesiPage() {
  const { show } = useToast();
  const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null);

  const [page, setPage] = useState(1);

  const { data: sessions, total, loading, refresh } = useCachedList<SessionInfo>(
    () => api.adminGetSessions({ page, limit: 25 }),
    `/admin/sessions?p=${page}`,
    [page],
  );

  const handleRevokeSession = async () => {
    if (!revokeTarget) return;
    try {
      await api.adminRevokeSession(revokeTarget.id);
      show('success', 'Sesi berhasil dicabut');
      setRevokeTarget(null);
      refresh();
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal mencabut sesi');
    }
  };

  return (
    <PageContainer size="xl" bottomBar>
      <BackLink to="/admin/akun" />
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Sesi Aktif
          </h2>
          <p className="text-xs text-aam-text-muted">
            {total} sesi sedang login
          </p>
        </div>
        <PageMenu
          menuTitle="Menu Sesi"
          links={[
            { key: 'daftar', label: 'Daftar Akun', path: '/admin/akun', icon: 'group' },
            {
              key: 'persetujuan',
              label: 'Persetujuan',
              path: '/admin/akun/persetujuan',
              icon: 'how_to_reg',
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
          { key: 'daftar', label: 'Daftar Akun', path: '/admin/akun', icon: 'group', description: 'Semua akun pengguna' },
          { key: 'persetujuan', label: 'Persetujuan', path: '/admin/akun/persetujuan', icon: 'how_to_reg', description: 'Antrean akun menunggu' },
          { key: 'aktivitas', label: 'Aktivitas', path: '/admin/akun/aktivitas', icon: 'history', description: 'Log aktivitas akun' },
        ]}
      >

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
              <th className="pb-2 font-medium">Pengguna</th>
              <th className="pb-2 font-medium">Perangkat</th>
              <th className="pb-2 font-medium">IP</th>
              <th className="pb-2 font-medium">Metode</th>
              <th className="pb-2 font-medium">Login</th>
              <th className="pb-2 font-medium">Aktif Terakhir</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={7}><TableSkeleton rows={3} cols={6} /></td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon="devices_off" message="Tidak ada sesi aktif" /></td></tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="border-b border-aam-border/50">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-aam-text">{s.user?.name || '—'}</span>
                      {s.current && <Badge variant="green">Sesi ini</Badge>}
                    </div>
                    <p className="text-xs text-aam-text-muted">{s.user?.email}</p>
                  </td>
                  <td className="py-3 text-aam-text-muted">{s.deviceSummary}</td>
                  <td className="py-3 text-aam-text-muted font-mono text-xs">{s.ipAddress}</td>
                  <td className="py-3">
                    <Badge variant={s.loginMethod === 'google' ? 'blue' : 'gray'}>
                      {s.loginMethod === 'google' ? 'Google' : 'Password'}
                    </Badge>
                  </td>
                  <td className="py-3 text-xs text-aam-text-muted">
                    {new Date(s.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                  </td>
                  <td className="py-3 text-xs text-aam-text-muted">
                    {new Date(s.lastActiveAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                  </td>
                  <td className="py-3">
                    {!s.current && (
                      <Button variant="secondary" size="sm" onClick={() => setRevokeTarget(s)}>
                        Cabut
                      </Button>
                    )}
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
        ) : sessions.length === 0 ? (
          <EmptyState icon="devices_off" message="Tidak ada sesi aktif" />
        ) : (
          sessions.map((s) => (
            <Card key={s.id} icon="devices">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-aam-text truncate">{s.user?.name}</p>
                  <p className="text-xs text-aam-text-muted truncate">{s.user?.email}</p>
                </div>
                {s.current && <Badge variant="green">Sesi ini</Badge>}
              </div>
              <div className="text-xs text-aam-text-muted space-y-0.5">
                <p>{s.deviceSummary}</p>
                <p>IP: {s.ipAddress} • {s.loginMethod === 'google' ? 'Google' : 'Password'}</p>
                <p>Aktif: {new Date(s.lastActiveAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
              </div>
              {!s.current && (
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => setRevokeTarget(s)}>
                  Cabut Sesi
                </Button>
              )}
            </Card>
          ))
        )}
      </div>

      <Pagination page={page} limit={25} total={total} onPageChange={setPage} loading={loading} />

      {/* Confirm dialog for session revoke */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Cabut Sesi"
        description={`Cabut sesi ${revokeTarget?.user?.name} di ${revokeTarget?.deviceSummary}?`}
        confirmLabel="Cabut"
        onConfirm={handleRevokeSession}
        onCancel={() => setRevokeTarget(null)}
      />
      </SubPageLayout>
    </PageContainer>
  );
}
