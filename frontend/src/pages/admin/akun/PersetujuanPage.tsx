import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AdminUser , ApiError } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge, roleLabel, roleVariant } from '../../../components/Badge';
import { BackLink } from '../../../components/BackLink';
import { SubPageLayout } from '../../../components/SubPageLinks';
import { EmptyState } from '../../../components/EmptyState';
import { Skeleton } from '../../../components/Skeleton';
import { PageContainer } from '../../../components/PageContainer';

export function PersetujuanPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [pending, setPending] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const p = await api.adminGetPending();
      setPending(p);
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat pendaftar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to="/admin/akun" />
      <h2 className="text-lg font-heading font-semibold text-aam-text mt-3 mb-4">
        Persetujuan Pendaftaran
      </h2>

      <SubPageLayout
        links={[
          { key: 'daftar', label: 'Daftar Akun', path: '/admin/akun', icon: 'group', description: 'Semua akun pengguna' },
          { key: 'sesi', label: 'Sesi Aktif', path: '/admin/akun/sesi', icon: 'devices', description: 'Perangkat yg sedang login' },
          { key: 'aktivitas', label: 'Aktivitas', path: '/admin/akun/aktivitas', icon: 'history', description: 'Log aktivitas akun' },
        ]}
      >

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : pending.length === 0 ? (
        <Card icon="how_to_reg">
          <EmptyState icon="check_circle" message="Tidak ada pendaftar menunggu persetujuan" />
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((u) => (
            <Card key={u.id} icon="person">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-aam-yellow flex items-center justify-center text-yellow-900 text-sm font-medium flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-aam-text truncate">{u.name}</p>
                    <p className="text-xs text-aam-text-muted truncate">{u.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {u.requestedRoles.map((r) => (
                        <Badge key={r} variant={roleVariant(r)}>{roleLabel(r)}</Badge>
                      ))}
                    </div>
                    {u.registrationNote && (
                      <p className="text-xs text-aam-text-muted mt-1.5">
                        Keterangan: {u.registrationNote}
                      </p>
                    )}
                    <p className="text-xs text-aam-text-muted mt-1">
                      Daftar: {new Date(u.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  icon="visibility"
                  onClick={() => navigate(`/admin/akun/persetujuan/${u.id}`)}
                >
                  Tinjau
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      </SubPageLayout>
    </PageContainer>
  );
}
