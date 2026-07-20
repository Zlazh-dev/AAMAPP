import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, AdminUser, ApiError } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge, roleLabel } from '../../../components/Badge';
import { BackLink } from '../../../components/BackLink';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { RoleSelector } from './RoleSelector';
import { Skeleton } from '../../../components/Skeleton';
import { useUnsavedChanges } from '../../../app/useUnsavedChanges';
import { PageContainer } from '../../../components/PageContainer';

export function PersetujuanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [originalRoles, setOriginalRoles] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const u = await api.adminGetUser(parseInt(id!, 10));
      if (u.status !== 'pending') {
        show('error', 'Akun ini tidak dalam status pending');
        navigate('/admin/akun/persetujuan');
        return;
      }
      setUser(u);
      setRoles(u.requestedRoles);
      setOriginalRoles(u.requestedRoles);
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Akun tidak ditemukan');
      navigate('/admin/akun/persetujuan');
    } finally {
      setLoading(false);
    }
  };

  // Dirty when roles differ from original
  const rolesChanged = JSON.stringify(roles.sort()) !== JSON.stringify(originalRoles.sort());
  const { setDirty, guard } = useUnsavedChanges(false, {
    description: 'Peran final yang Anda pilih belum disimpan. Yakin ingin meninggalkan halaman?',
  });

  // Sync ref-based dirty tracker with computed rolesChanged
  useEffect(() => {
    setDirty(rolesChanged);
  }, [rolesChanged, setDirty]);

  const handleApprove = async () => {
    if (roles.length === 0) { show('error', 'Minimal pilih satu peran'); return; }
    setApproving(true);
    try {
      await api.adminApproveUser(parseInt(id!, 10), roles);
      show('success', 'Akun disetujui dan diaktifkan');
      setOriginalRoles(roles);
      setDirty(false);
      navigate('/admin/akun/persetujuan');
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal menyetujui');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { show('error', 'Alasan penolakan wajib diisi'); return; }
    setRejecting(true);
    try {
      // Note: the API deletes the user directly — we pass the reason via audit
      // For now, we delete the user (which creates audit entry)
      await api.adminDeleteUser(parseInt(id!, 10));
      show('success', 'Pendaftaran ditolak dan akun dihapus');
      navigate('/admin/akun/persetujuan');
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal menolak');
    } finally {
      setRejecting(false);
      setShowRejectConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to="/admin/akun/persetujuan" />
      <h2 className="text-lg font-heading font-semibold text-aam-text mt-3 mb-4">
        Tinjau Pendaftaran
      </h2>

      {/* Identity card */}
      <Card icon="person">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-aam-yellow flex items-center justify-center text-yellow-900 text-lg font-medium flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-medium text-aam-text">{user.name}</p>
            <p className="text-sm text-aam-text-muted">{user.email}</p>
            <p className="text-xs text-aam-text-muted mt-0.5">
              Mendaftar: {new Date(user.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <p className="text-xs text-aam-text-muted mb-1">Peran Diajukan:</p>
            <div className="flex flex-wrap gap-1.5">
              {user.requestedRoles.map((r: string) => (
                <Badge key={r} variant="yellow">{roleLabel(r)}</Badge>
              ))}
            </div>
          </div>
          {user.registrationNote && (
            <div>
              <p className="text-xs text-aam-text-muted mb-1">Keterangan:</p>
              <p className="text-sm text-aam-text bg-gray-50 rounded-md p-2">{user.registrationNote}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Role selection for approval */}
      <Card icon="how_to_reg">
        <h3 className="text-sm font-semibold text-aam-text mb-2">Peran Final</h3>
        <p className="text-xs text-aam-text-muted mb-4">
          Peran berikut prefilled dari ajuan. Anda bebas mengubah sebelum menyetujui.
        </p>
        <RoleSelector selected={roles} onChange={setRoles} />

        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <Button
            variant="primary"
            size="lg"
            icon="check_circle"
            loading={approving}
            disabled={roles.length === 0}
            onClick={handleApprove}
            className="flex-1"
          >
            Setujui &amp; Aktifkan
          </Button>
          <Button
            variant="danger"
            size="lg"
            icon="cancel"
            onClick={() => setShowRejectConfirm(true)}
            className="flex-1"
          >
            Tolak
          </Button>
        </div>
      </Card>

      {/* Reject dialog with reason */}
      <ConfirmDialog
        open={showRejectConfirm}
        title="Tolak Pendaftaran"
        description="Akun akan dihapus. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Tolak & Hapus"
        onConfirm={handleReject}
        onCancel={() => setShowRejectConfirm(false)}
      />

      {/* Unsaved changes guard */}
      {guard}
    </PageContainer>
  );
}
