import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError, Guru } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { BackLink } from '../../../components/BackLink';
import { Skeleton } from '../../../components/Skeleton';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { PageMenu } from '../../../components/PageMenu';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /admin/orang/guru/:id — POLA A detail.
 * Kartu: biodata, status wajah placeholder, akun tertaut, jumlah paket.
 * Header: Edit & Hapus (desktop inline / mobile PageMenu).
 */
export function GuruDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const [guru, setGuru] = useState<Guru | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadGuru();
  }, [id]);

  const loadGuru = async () => {
    setLoading(true);
    try {
      const g = await api.adminGetGuruById(parseInt(id!, 10));
      setGuru(g);
    } catch {
      show('error', 'Guru tidak ditemukan');
      navigate('/admin/orang/guru');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.adminDeleteGuru(parseInt(id!, 10));
      show('success', 'Guru berhasil dihapus');
      navigate('/admin/orang/guru');
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal menghapus');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
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

  if (!guru) return null;

  const detailRows = [
    { label: 'NIP', value: guru.nip || '—' },
    { label: 'Jenis Kelamin', value: guru.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan' },
    { label: 'Telepon', value: guru.telepon || '—' },
    { label: 'Status', value: guru.status === 'aktif' ? 'Aktif' : 'Nonaktif' },
  ];

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to="/admin/orang/guru" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {guru.fotoUrl ? (
            <img src={guru.fotoUrl} alt={guru.nama} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-aam-green flex items-center justify-center text-white text-lg font-medium flex-shrink-0">
              {guru.nama.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-heading font-semibold text-aam-text truncate">{guru.nama}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={guru.status === 'aktif' ? 'green' : 'gray'}>
                {guru.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
              </Badge>
              {guru.waliKelas && guru.waliKelas.length > 0 && (
                <Badge variant="blue">Wali {guru.waliKelas.map((k) => k.nama).join(', ')}</Badge>
              )}
            </div>
          </div>
        </div>
        <PageMenu
          menuTitle={`Menu ${guru.nama}`}
          actions={[
            {
              key: 'edit',
              label: 'Edit',
              icon: 'edit',
              variant: 'primary',
              onClick: () => navigate(`/admin/orang/guru/${guru.id}/edit`),
            },
            {
              key: 'hapus',
              label: 'Hapus',
              icon: 'delete',
              variant: 'danger',
              onClick: () => setDeleteOpen(true),
            },
          ]}
          links={[
            { key: 'daftar', label: 'Daftar Guru', path: '/admin/orang/guru', icon: 'school' },
            { key: 'siswa', label: 'Data Siswa', path: '/admin/orang/siswa', icon: 'diversity_3' },
          ]}
        />
      </div>

      {/* Biodata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon="person" className="p-5">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Biodata</h3>
          <dl className="space-y-2">
            {detailRows.map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <dt className="text-aam-text-muted">{row.label}</dt>
                <dd className="text-aam-text font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card icon="account_circle" className="p-5">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Akun & Penugasan</h3>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-aam-text-muted">Akun Tertaut</dt>
              <dd>
                {guru.punyaAkun ? (
                  <Badge variant="green">Ya</Badge>
                ) : (
                  <Badge variant="gray">Belum</Badge>
                )}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-aam-text-muted">Jumlah Paket (TA Aktif)</dt>
              <dd className="text-aam-text font-medium">{guru.jumlahPaket}</dd>
            </div>
          </dl>
        </Card>

        <Card icon="face" className="p-5">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Status Wajah</h3>
          <div className="flex items-center gap-2">
            <Badge variant="gray">Belum — fitur F3</Badge>
          </div>
        </Card>
      </div>

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteOpen}
        title="Hapus Guru"
        description={`Yakin menghapus ${guru.nama}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </PageContainer>
  );
}
