import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Skeleton } from '../../components/Skeleton';
import { BackLink } from '../../components/BackLink';

const STATUS_VARIANT: Record<string, 'yellow' | 'green' | 'red'> = {
  MENUNGGU: 'yellow',
  DISETUJUI: 'green',
  DITOLAK: 'red',
};

const KATEGORI_LABEL: Record<string, string> = {
  R: 'Ringan', S: 'Sedang', B: 'Berat', SB: 'Sangat Berat', KHUSUS: 'Khusus',
};

const SUMBER_LABEL: Record<string, string> = {
  LANGSUNG: 'Langsung', LAPORAN: 'Laporan', OTOMATIS_T: 'Otomatis (Terlambat)',
};

/**
 * /kesiswaan/pelanggaran/:id — detail satu pelanggaran (IA-HIERARCHY-V2 Tahap 2).
 * Sub halaman: tidak masuk sidebar, BackLink ke daftar pelanggaran.
 */
export function PelanggaranDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getPelanggaranDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.getPelanggaranDetail(parseInt(id, 10));
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.body?.message : 'Gagal memuat detail pelanggaran');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <PageContainer size="lg">
        <BackLink to="/kesiswaan/pelanggaran" />
        <Skeleton className="h-8 w-48 mt-4" />
        <Skeleton className="h-64 mt-4" />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer size="lg">
        <BackLink to="/kesiswaan/pelanggaran" />
        <div className="mt-8 text-center">
          <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '3rem' }}>
            error
          </span>
          <p className="text-sm text-aam-text-muted mt-2">{error || 'Pelanggaran tidak ditemukan'}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg">
      <BackLink to="/kesiswaan/pelanggaran" />

      <div className="flex items-center gap-3 mt-4 mb-6">
        <span className="material-symbols-outlined text-red-600" style={{ fontSize: 28 }}>
          warning
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-aam-text truncate">
            Detail Pelanggaran #{data.id}
          </h2>
          <p className="text-sm text-aam-text-muted">
            {data.siswa.nama} — {KATEGORI_LABEL[data.kategori] ?? data.kategori} ({data.poin} poin)
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[data.status] ?? 'yellow'}>{data.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data siswa */}
        <Card icon="diversity_3">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Data Siswa</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">Nama</dt>
              <dd className="text-aam-text font-medium">{data.siswa.nama}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">NIS</dt>
              <dd className="text-aam-text">{data.siswa.nis ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">Kelas</dt>
              <dd className="text-aam-text">{data.siswa.kelas ?? '—'}</dd>
            </div>
          </dl>
        </Card>

        {/* Jenis & poin */}
        <Card icon="warning">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Jenis &amp; Poin</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">Kategori</dt>
              <dd className="text-aam-text font-medium">{KATEGORI_LABEL[data.kategori] ?? data.kategori}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">Poin</dt>
              <dd className="text-red-600 font-bold">{data.poin}</dd>
            </div>
            {data.katalog && (
              <div className="flex justify-between">
                <dt className="text-aam-text-muted">Butir katalog</dt>
                <dd className="text-aam-text">#{data.katalog.nomor} — {data.katalog.bentuk}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Pelapor & waktu */}
        <Card icon="history">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Pelapor &amp; Waktu</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">Pelapor</dt>
              <dd className="text-aam-text">{data.pelapor?.name ?? 'Sistem'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">Sumber</dt>
              <dd className="text-aam-text">{SUMBER_LABEL[data.sumber] ?? data.sumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">Tanggal</dt>
              <dd className="text-aam-text">{data.tanggal}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">Dicatat</dt>
              <dd className="text-aam-text">
                {new Date(data.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Status verifikasi */}
        <Card icon="task_alt">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Status Verifikasi</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-aam-text-muted">Status</dt>
              <dd><Badge variant={STATUS_VARIANT[data.status] ?? 'yellow'}>{data.status}</Badge></dd>
            </div>
            {data.verifikator && (
              <div className="flex justify-between">
                <dt className="text-aam-text-muted">Verifikator</dt>
                <dd className="text-aam-text">{data.verifikator.name}</dd>
              </div>
            )}
            {data.catatan && (
              <div>
                <dt className="text-aam-text-muted mb-1">Catatan</dt>
                <dd className="text-aam-text text-xs bg-gray-50 rounded p-2">{data.catatan}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* Tindak lanjut terkait */}
      <Card icon="assignment_late" className="mt-4">
        <h3 className="text-sm font-semibold text-aam-text mb-3">Tindak Lanjut Terkait</h3>
        {data.tindakLanjut.length === 0 ? (
          <p className="text-sm text-aam-text-muted">Belum ada tindak lanjut.</p>
        ) : (
          <div className="space-y-2">
            {data.tindakLanjut.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-aam-border last:border-0 pb-2 last:pb-0">
                <div>
                  <span className="text-aam-text font-medium">Tahap {t.tahap}</span>
                  <span className="text-aam-text-muted"> — ambang {t.ambang} poin</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-aam-text-muted">
                    {t.dilaksanakanPada ? new Date(t.dilaksanakanPada).toLocaleDateString('id-ID') : '—'}
                  </span>
                  <Badge variant={t.status === 'SELESAI' ? 'green' : 'yellow'}>{t.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Riwayat perubahan */}
      <Card icon="history" className="mt-4">
        <h3 className="text-sm font-semibold text-aam-text mb-3">Riwayat Perubahan</h3>
        {data.riwayat.length === 0 ? (
          <p className="text-sm text-aam-text-muted">Belum ada riwayat.</p>
        ) : (
          <div className="space-y-2">
            {data.riwayat.map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-sm border-b border-aam-border last:border-0 pb-2 last:pb-0">
                <span className="text-aam-text-muted text-xs whitespace-nowrap mt-0.5 w-32 shrink-0">
                  {new Date(r.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <div className="min-w-0">
                  <span className="text-aam-text font-medium">{r.userName ?? 'Sistem'}</span>
                  <span className="text-aam-text-muted"> — {r.action}</span>
                  {r.summary && <p className="text-xs text-aam-text-muted truncate">{r.summary}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}