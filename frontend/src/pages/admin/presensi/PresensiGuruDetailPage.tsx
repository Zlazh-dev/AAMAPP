import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../../api/client';
import { PageContainer } from '../../../components/PageContainer';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Skeleton } from '../../../components/Skeleton';
import { BackLink } from '../../../components/BackLink';

const STATUS_VARIANT: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  HADIR: 'green', TERLAMBAT: 'yellow', ALPHA: 'red',
  IZIN: 'blue', SAKIT: 'blue', DINAS: 'blue', LIBUR: 'gray',
  TANPA_KBM: 'gray',
};

const STATUS_LABEL: Record<string, string> = {
  HADIR: 'Hadir', TERLAMBAT: 'Terlambat', ALPHA: 'Alpha',
  IZIN: 'Izin', SAKIT: 'Sakit', DINAS: 'Dinas', LIBUR: 'Libur',
  TANPA_KBM: 'Tanpa KBM',
};

function fmtTime(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

/**
 * /tu/presensi-guru/detail?guruId=&tanggal=
 * Sub-detail presensi guru (UX-POLISH §J).
 *
 * Mobile card-list di PresensiGuruPage menampilkan ringkasan (nama + status).
 * Klik kartu → halaman ini dgn rincian lengkap: check-in/out, jadwal KBM,
 * izin aktif, riwayat 7 hari.
 */
export function PresensiGuruDetailPage() {
  const [searchParams] = useSearchParams();
  const guruId = searchParams.get('guruId');
  const tanggalParam = searchParams.get('tanggal');

  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminGetPresensiGuruDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guruId) { setError('guruId wajib diisi'); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.adminGetPresensiGuruDetail({
          guruId: parseInt(guruId, 10),
          tanggal: tanggalParam || undefined,
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.body?.message : 'Gagal memuat detail');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [guruId, tanggalParam]);

  if (loading) {
    return (
      <PageContainer size="lg">
        <BackLink to="/tu/presensi-guru" />
        <Skeleton className="h-8 w-48 mt-4" />
        <Skeleton className="h-64 mt-4" />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer size="lg">
        <BackLink to="/tu/presensi-guru" />
        <p className="text-sm text-aam-text-muted mt-8 text-center">{error || 'Data tidak ditemukan'}</p>
      </PageContainer>
    );
  }

  const { guru, tanggal, statusHarian, presensi, izinAktif, jadwalKBM, riwayat } = data;

  return (
    <PageContainer size="lg">
      <BackLink to="/tu/presensi-guru" />

      <div className="flex items-center gap-3 mt-4 mb-6">
        {guru.fotoUrl && (
          <img src={guru.fotoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-aam-text truncate">{guru.nama}</h2>
          <p className="text-sm text-aam-text-muted">{guru.nip ?? '—'} · {tanggal}</p>
        </div>
        <Badge variant={STATUS_VARIANT[statusHarian] ?? 'gray'}>
          {STATUS_LABEL[statusHarian] ?? statusHarian}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check-in/out */}
        <Card icon="schedule">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Presensi</h3>
          {presensi ? (
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-aam-text-muted">Status</dt>
                <dd><Badge variant={STATUS_VARIANT[presensi.status] ?? 'gray'}>{STATUS_LABEL[presensi.status] ?? presensi.status}</Badge></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-aam-text-muted">Check-in</dt>
                <dd className="text-aam-text">{fmtTime(presensi.checkInAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-aam-text-muted">Check-out</dt>
                <dd className="text-aam-text">{fmtTime(presensi.checkOutAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-aam-text-muted">Sumber</dt>
                <dd className="text-aam-text">{presensi.source ?? '—'}</dd>
              </div>
              {presensi.alasan && (
                <div>
                  <dt className="text-aam-text-muted mb-1">Alasan manual</dt>
                  <dd className="text-aam-text text-xs bg-gray-50 rounded p-2">{presensi.alasan}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-aam-text-muted">Belum ada presensi tercatat.</p>
          )}
        </Card>

        {/* Izin aktif */}
        <Card icon="event_available">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Izin Aktif</h3>
          {izinAktif ? (
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-aam-text-muted">Jenis</dt>
                <dd className="text-aam-text">{izinAktif.jenis ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-aam-text-muted">Periode</dt>
                <dd className="text-aam-text">{izinAktif.dari} — {izinAktif.sampai}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-aam-text-muted">Status</dt>
                <dd><Badge variant="green">{izinAktif.status ?? 'DISETUJUI'}</Badge></dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-aam-text-muted">Tidak ada izin aktif.</p>
          )}
        </Card>
      </div>

      {/* Jadwal KBM hari ini */}
      <Card icon="calendar_today" className="mt-4">
        <h3 className="text-sm font-semibold text-aam-text mb-3">Jadwal KBM Hari Ini</h3>
        {jadwalKBM.length === 0 ? (
          <p className="text-sm text-aam-text-muted">Tidak ada jadwal KBM.</p>
        ) : (
          <div className="space-y-2">
            {jadwalKBM.map((j) => (
              <div key={j.id} className="flex items-center justify-between text-sm border-b border-aam-border last:border-0 pb-2 last:pb-0">
                <div>
                  <span className="text-aam-text font-medium">{j.mapel}</span>
                  <span className="text-aam-text-muted"> · {j.kelas}</span>
                </div>
                <span className="text-xs text-aam-text-muted">{j.jamMulai}–{j.jamSelesai}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Riwayat 7 hari */}
      <Card icon="history" className="mt-4">
        <h3 className="text-sm font-semibold text-aam-text mb-3">Riwayat 7 Hari Terakhir</h3>
        <div className="space-y-2">
          {riwayat.map((r) => (
            <div key={r.tanggal} className="flex items-center justify-between text-sm border-b border-aam-border last:border-0 pb-2 last:pb-0">
              <div>
                <span className="text-aam-text font-medium">{r.tanggal}</span>
                {r.checkInAt && <span className="text-aam-text-muted"> · {fmtTime(r.checkInAt)}</span>}
              </div>
              <Badge variant={r.status ? (STATUS_VARIANT[r.status] ?? 'gray') : 'gray'}>
                {r.status ? (STATUS_LABEL[r.status] ?? r.status) : 'Belum'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}