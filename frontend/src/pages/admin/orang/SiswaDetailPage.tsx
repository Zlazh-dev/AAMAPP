import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError, Siswa, ActivityLogEntry, ActivityLogResponse } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { BackLink } from '../../../components/BackLink';
import { Skeleton } from '../../../components/Skeleton';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { PageMenu } from '../../../components/PageMenu';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /kurikulum/orang/siswa/:id � POLA A detail.
 * Kartu: biodata lengkap, kelas, riwayat pindah (from activity_logs).
 */
export function SiswaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const [siswa, setSiswa] = useState<Siswa | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [riwayat, setRiwayat] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    loadSiswa();
  }, [id]);

  const loadSiswa = async () => {
    setLoading(true);
    try {
      const s = await api.adminGetSiswaById(parseInt(id!, 10));
      setSiswa(s);
      // Load riwayat pindah from activity logs
      try {
        const logs = await api.adminGetActivities({
          entity: 'siswa',
          limit: 100,
        });
        const pindahLogs = logs.items.filter(
          (l) =>
            l.entityId === String(s.id) &&
            (l.action.includes('PINDAH') || l.summary?.includes('Memindahkan')),
        );
        setRiwayat(pindahLogs);
      } catch (err) {}
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Siswa tidak ditemukan');
      navigate('/kurikulum/orang/siswa');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.adminDeleteSiswa(parseInt(id!, 10));
      show('success', 'Siswa berhasil dihapus');
      navigate('/kurikulum/orang/siswa');
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

  if (!siswa) return null;

  const pribadiRows = [
    { label: 'NIS', value: siswa.nis },
    { label: 'NISN', value: siswa.nisn || '�' },
    { label: 'Jenis Kelamin', value: siswa.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan' },
    { label: 'Tempat Lahir', value: siswa.tempatLahir || '�' },
    { label: 'Tanggal Lahir', value: siswa.tanggalLahir ? new Date(siswa.tanggalLahir).toLocaleDateString('id-ID') : '�' },
    { label: 'Agama', value: siswa.agama || '�' },
    { label: 'Alamat', value: siswa.alamat || '�' },
    { label: 'Telepon', value: siswa.telepon || '�' },
    { label: 'Status Dalam Keluarga', value: siswa.statusDalamKeluarga || '�' },
    { label: 'Anak Ke', value: siswa.anakKe ? String(siswa.anakKe) : '�' },
  ];

  const ortuRows = [
    { label: 'Nama Ayah', value: siswa.namaAyah || '�' },
    { label: 'Pekerjaan Ayah', value: siswa.pekerjaanAyah || '�' },
    { label: 'Nama Ibu', value: siswa.namaIbu || '�' },
    { label: 'Pekerjaan Ibu', value: siswa.pekerjaanIbu || '�' },
  ];

  const waliRows = [
    { label: 'Nama Wali', value: siswa.namaWali || '�' },
    { label: 'Alamat Wali', value: siswa.alamatWali || '�' },
    { label: 'Telepon Wali', value: siswa.teleponWali || '�' },
    { label: 'Pekerjaan Wali', value: siswa.pekerjaanWali || '�' },
  ];

  const sekolahRows = [
    { label: 'Sekolah Asal', value: siswa.sekolahAsal || '�' },
    { label: 'Diterima di Kelas', value: siswa.diterimaDiKelas || '�' },
    { label: 'Diterima Tanggal', value: siswa.diterimaTanggal ? new Date(siswa.diterimaTanggal).toLocaleDateString('id-ID') : '�' },
    { label: 'Status', value: siswa.status === 'aktif' ? 'Aktif' : 'Nonaktif' },
  ];

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to="/kurikulum/orang/siswa" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {siswa.fotoUrl ? (
            <img src={siswa.fotoUrl} alt={siswa.nama} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-aam-green flex items-center justify-center text-white text-lg font-medium flex-shrink-0">
              {siswa.nama.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-heading font-semibold text-aam-text truncate">{siswa.nama}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={siswa.status === 'aktif' ? 'green' : 'gray'}>
                {siswa.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
              </Badge>
              {siswa.kelas && <Badge variant="blue">{siswa.kelas.nama}</Badge>}
            </div>
          </div>
        </div>
        <PageMenu
          menuTitle={`Menu ${siswa.nama}`}
          actions={[
            {
              key: 'edit',
              label: 'Edit',
              icon: 'edit',
              variant: 'primary',
              onClick: () => navigate(`/kurikulum/orang/siswa/${siswa.id}/edit`),
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
            { key: 'daftar', label: 'Daftar Siswa', path: '/kurikulum/orang/siswa', icon: 'diversity_3' },
            { key: 'guru', label: 'Data Guru', path: '/kurikulum/orang/guru', icon: 'school' },
          ]}
        />
      </div>

      {/* Biodata cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card icon="person">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Data Pribadi</h3>
          <dl className="space-y-2">
            {pribadiRows.map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <dt className="text-aam-text-muted">{r.label}</dt>
                <dd className="text-aam-text font-medium text-right">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card icon="family_restroom">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Orang Tua</h3>
          <dl className="space-y-2">
            {ortuRows.map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <dt className="text-aam-text-muted">{r.label}</dt>
                <dd className="text-aam-text font-medium text-right">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card icon="guardian">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Wali</h3>
          <dl className="space-y-2">
            {waliRows.map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <dt className="text-aam-text-muted">{r.label}</dt>
                <dd className="text-aam-text font-medium text-right">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card icon="school">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Sekolah</h3>
          <dl className="space-y-2">
            {sekolahRows.map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <dt className="text-aam-text-muted">{r.label}</dt>
                <dd className="text-aam-text font-medium text-right">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {/* Riwayat pindah kelas */}
      <Card icon="swap_horiz">
        <h3 className="text-sm font-semibold text-aam-text mb-3">Riwayat Pindah Kelas</h3>
        {riwayat.length === 0 ? (
          <p className="text-sm text-aam-text-muted">Belum ada riwayat pindah kelas.</p>
        ) : (
          <div className="space-y-2">
            {riwayat.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm py-2 border-b border-aam-border/30 last:border-0">
                <span className="material-symbols-outlined text-aam-text-muted flex-shrink-0" style={{ fontSize: '1.125rem' }}>
                  swap_horiz
                </span>
                <div className="flex-1">
                  <p className="text-aam-text">{log.summary}</p>
                  <p className="text-xs text-aam-text-muted">
                    {new Date(log.createdAt).toLocaleString('id-ID')} � {log.userName || '�'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteOpen}
        title="Hapus Siswa"
        description={`Yakin menghapus ${siswa.nama}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </PageContainer>
  );
}
