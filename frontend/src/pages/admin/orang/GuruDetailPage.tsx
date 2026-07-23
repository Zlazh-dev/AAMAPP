import React, { useState, useEffect, useCallback } from 'react';
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

type FaceStatus = 'BELUM' | 'MENUNGGU_VALIDASI' | 'TERVALIDASI' | 'DITOLAK';

const FACE_STATUS_LABEL: Record<FaceStatus, string> = {
  BELUM: 'Belum Mendaftar',
  MENUNGGU_VALIDASI: 'Menunggu Validasi',
  TERVALIDASI: 'Tervalidasi',
  DITOLAK: 'Ditolak',
};

const FACE_STATUS_VARIANT: Record<FaceStatus, 'gray' | 'yellow' | 'green' | 'red'> = {
  BELUM: 'gray',
  MENUNGGU_VALIDASI: 'yellow',
  TERVALIDASI: 'green',
  DITOLAK: 'red',
};

/**
 * /kurikulum/orang/guru/:id ï¿½ POLA A detail.
 * Kartu: biodata, akun/penugasan, status wajah (validasi admin ï¿½D).
 * Admin dapat Terima/Tolak wajah bila status MENUNGGU_VALIDASI.
 */
export function GuruDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const [guru, setGuru] = useState<Guru | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [validating, setValidating] = useState(false);

  const guruId = parseInt(id!, 10);

  const loadGuru = useCallback(async () => {
    setLoading(true);
    try {
      const g = await api.adminGetGuruById(guruId);
      setGuru(g);
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Guru tidak ditemukan');
      navigate('/kurikulum/orang/guru');
    } finally {
      setLoading(false);
    }
  }, [guruId]);

  useEffect(() => { loadGuru(); }, [loadGuru]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.adminDeleteGuru(guruId);
      show('success', 'Guru berhasil dihapus');
      navigate('/kurikulum/orang/guru');
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal menghapus');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleValidasiWajah = async (aksi: 'terima' | 'tolak') => {
    setValidating(true);
    try {
      await api.adminValidasiWajah(guruId, aksi);
      show('success', aksi === 'terima' ? 'Wajah guru diterima.' : 'Wajah guru ditolak.');
      loadGuru();
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal validasi wajah.');
    } finally {
      setValidating(false);
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

  const faceStatus: FaceStatus = guru.faceStatus ?? 'BELUM';

  const detailRows = [
    { label: 'NIP', value: guru.nip || '—' },
    { label: 'Jenis Kelamin', value: guru.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan' },
    { label: 'Telepon', value: guru.telepon || '—' },
    { label: 'Email', value: guru.email || '—' },
    { label: 'Status', value: guru.status === 'aktif' ? 'Aktif' : 'Nonaktif' },
  ];

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to="/kurikulum/orang/guru" />

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
              onClick: () => navigate(`/kurikulum/orang/guru/${guru.id}/edit`),
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
            { key: 'daftar', label: 'Daftar Guru', path: '/kurikulum/orang/guru', icon: 'school' },
            { key: 'siswa', label: 'Data Siswa', path: '/kurikulum/orang/siswa', icon: 'diversity_3' },
          ]}
        />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon="person">
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

        <Card icon="account_circle">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Akun &amp; Penugasan</h3>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-aam-text-muted">Akun Tertaut</dt>
              <dd>
                {guru.punyaAkun && guru.userId ? (
                  <button
                    id={`link-akun-guru-${guru.id}`}
                    onClick={() => navigate(`/admin/users/${guru.userId}`)}
                    className="text-aam-green underline text-xs font-medium"
                  >
                    Lihat Akun #{guru.userId}
                  </button>
                ) : guru.punyaAkun ? (
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

        {/* Wajah Validation Card — F3b: snapshot + metadata untuk validasi bermakna */}
        <div id="card-wajah-guru">
        <Card icon="face_retouching_natural" className="md:col-span-2">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Pendaftaran Wajah</h3>
          <div className="flex flex-col md:flex-row gap-4">
            {/* F3b: snapshot wajah untuk perbandingan visual */}
            <div className="shrink-0">
              {guru.faceSnapshotUrl ? (
                <img
                  src={api.adminGetFaceSnapshotUrl(guruId)}
                  alt={`Snapshot wajah ${guru.nama}`}
                  className="w-32 h-32 object-cover rounded-lg border border-aam-border bg-aam-surface"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg border border-dashed border-aam-border bg-aam-surface flex items-center justify-center p-2 text-center">
                  <span className="text-xs text-aam-text-muted">
                    {faceStatus === 'BELUM'
                      ? 'Belum enroll'
                      : 'Enroll sebelum fitur foto — minta guru enroll ulang'}
                  </span>
                </div>
              )}
            </div>

            {/* Metadata + aksi validasi */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div id="badge-face-status"><Badge variant={FACE_STATUS_VARIANT[faceStatus]}>
                  {FACE_STATUS_LABEL[faceStatus]}
                </Badge></div>
              </div>

              <dl className="text-sm space-y-1">
                <div className="flex justify-between gap-4">
                  <dt className="text-aam-text-muted">Tanggal enroll</dt>
                  <dd className="text-aam-text font-medium">
                    {guru.faceUpdatedAt
                      ? new Date(guru.faceUpdatedAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-aam-text-muted">Jumlah pose</dt>
                  <dd className="text-aam-text font-medium">
                    {guru.facePoseCount > 0 ? `${guru.facePoseCount} pose` : '—'}
                  </dd>
                </div>
              </dl>

              {faceStatus === 'MENUNGGU_VALIDASI' && (
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => handleValidasiWajah('terima')}
                    disabled={validating}
                    id="btn-terima-wajah"
                  >
                    {validating ? 'Memproses...' : 'Terima'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleValidasiWajah('tolak')}
                    disabled={validating}
                    id="btn-tolak-wajah"
                  >
                    Tolak
                  </Button>
                </div>
              )}

              {faceStatus === 'MENUNGGU_VALIDASI' && !guru.faceSnapshotUrl && (
                <p className="text-xs text-amber-600">
                  Enroll sebelum fitur foto — tidak ada snapshot untuk dibandingkan. Minta guru enroll ulang untuk validasi visual.
                </p>
              )}
              {faceStatus === 'BELUM' && (
                <p className="text-xs text-aam-text-muted">
                  Guru belum mendaftarkan wajah. Guru dapat mendaftar sendiri melalui menu Daftar Wajah.
                </p>
              )}
              {faceStatus === 'TERVALIDASI' && (
                <p className="text-xs text-aam-text-muted">
                  Wajah guru sudah tervalidasi dan dapat digunakan untuk presensi.
                </p>
              )}
              {faceStatus === 'DITOLAK' && (
                <p className="text-xs text-red-600">
                  Wajah ditolak. Guru perlu mendaftar ulang melalui menu Daftar Wajah.
                </p>
              )}
            </div>
          </div>
        </Card>
        </div>
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

