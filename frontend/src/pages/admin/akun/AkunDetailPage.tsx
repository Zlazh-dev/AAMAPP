import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, AdminUser, ApiError, SessionInfo } from '../../../api/client';
import { useAuth } from '../../../app/AuthContext';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge, roleLabel, roleVariant, statusVariant, statusLabel } from '../../../components/Badge';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { BackLink } from '../../../components/BackLink';
import { Skeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { PageContainer } from '../../../components/PageContainer';

export function AkunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { show } = useToast();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const u = await api.adminGetUser(parseInt(id!, 10));
      setUser(u);
      setSessions(u.sessions || []);
    } catch {
      show('error', 'Akun tidak ditemukan');
      navigate('/admin/akun');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await api.adminDeleteUser(parseInt(id!, 10));
      show('success', 'Akun berhasil dihapus');
      navigate('/admin/akun');
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal menghapus');
    }
  };

  const handleRevokeSession = async () => {
    if (!revokeTarget) return;
    try {
      await api.adminRevokeSession(revokeTarget.id);
      show('success', 'Sesi dicabut');
      setRevokeTarget(null);
      loadUser();
    } catch {
      show('error', 'Gagal mencabut sesi');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) return null;

  const isSelf = user.id === currentUser?.id;

  return (
    <PageContainer size="lg">
      <BackLink to="/admin/akun" />

      {/* Header */}
      <div className="flex items-center justify-between mt-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-aam-green flex items-center justify-center text-white text-lg font-medium flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-heading font-semibold text-aam-text">{user.name}</h2>
            <p className="text-sm text-aam-text-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <PageMenu
            menuTitle="Menu Akun"
            links={[
              { key: 'daftar', label: 'Daftar Akun', path: '/admin/akun', icon: 'group' },
              { key: 'sesi', label: 'Sesi Aktif', path: '/admin/akun/sesi', icon: 'devices' },
              { key: 'aktivitas', label: 'Aktivitas', path: '/admin/akun/aktivitas', icon: 'history' },
              {
                key: 'persetujuan',
                label: 'Persetujuan',
                path: '/admin/akun/persetujuan',
                icon: 'how_to_reg',
              },
            ]}
            actions={[
              {
                key: 'edit',
                label: 'Edit Akun Ini',
                icon: 'edit',
                variant: 'primary',
                onClick: () => navigate(`/admin/akun/${user.id}/edit`),
              },
              {
                key: 'delete',
                label: isSelf ? 'Hapus (akun sendiri, ditolak)' : 'Hapus Akun Ini',
                icon: 'delete',
                variant: 'danger',
                disabled: isSelf,
                onClick: () => {
                  if (!isSelf) setShowDeleteConfirm(true);
                },
              },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identity card */}
        <Card icon="person" className="p-5">
          <h3 className="text-sm font-semibold text-aam-text mb-4">Identitas</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-aam-text-muted">Nama</dt>
              <dd className="text-aam-text">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-aam-text-muted">Email</dt>
              <dd className="text-aam-text">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-aam-text-muted">Status</dt>
              <dd><Badge variant={statusVariant(user.status)}>{statusLabel(user.status)}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-aam-text-muted">Dibuat</dt>
              <dd className="text-aam-text">{new Date(user.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</dd>
            </div>
          </dl>
        </Card>

        {/* Roles card */}
        <Card icon="badge" className="p-5">
          <h3 className="text-sm font-semibold text-aam-text mb-4">Peran</h3>
          {user.roles.length === 0 ? (
            <p className="text-sm text-aam-text-muted">
              {user.status === 'pending' ? 'Belum ada peran — menunggu persetujuan' : 'Tidak ada peran'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((r: string) => (
                <Badge key={r} variant={roleVariant(r)}>{roleLabel(r)}</Badge>
              ))}
            </div>
          )}
          {user.status === 'pending' && user.requestedRoles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-aam-border">
              <p className="text-xs text-aam-text-muted mb-1">Peran diajukan:</p>
              <div className="flex flex-wrap gap-1.5">
                {user.requestedRoles.map((r: string) => (
                  <Badge key={r} variant="yellow">{roleLabel(r)}</Badge>
                ))}
              </div>
              {user.registrationNote && (
                <p className="mt-2 text-xs text-aam-text-muted">
                  Keterangan: {user.registrationNote}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Google card */}
        <Card icon="account_circle" className="p-5">
          <h3 className="text-sm font-semibold text-aam-text mb-4">Akun Google</h3>
          {user.googleLinked ? (
            <Badge variant="green">
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>link</span>
              Tertaut
            </Badge>
          ) : (
            <p className="text-sm text-aam-text-muted">Belum tertaut</p>
          )}
        </Card>

        {/* Sessions card */}
        <Card icon="devices" className="p-5">
          <h3 className="text-sm font-semibold text-aam-text mb-4">Sesi Aktif</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-aam-text-muted">Tidak ada sesi aktif</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1rem' }}>devices</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-aam-text truncate">{s.deviceSummary}</p>
                    <p className="text-xs text-aam-text-muted">{s.ipAddress}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setRevokeTarget(s)}>Cabut</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Hapus Akun"
        description={`Hapus akun ${user.name} (${user.email})? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Cabut Sesi"
        description={`Cabut sesi di ${revokeTarget?.deviceSummary}?`}
        confirmLabel="Cabut"
        onConfirm={handleRevokeSession}
        onCancel={() => setRevokeTarget(null)}
      />
    </PageContainer>
  );
}
