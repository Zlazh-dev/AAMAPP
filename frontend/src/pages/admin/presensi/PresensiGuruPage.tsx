import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../../api/client';
import { PageContainer } from '../../../components/PageContainer';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { useToast } from '../../../components/Toast';
import { BackLink } from '../../../components/BackLink';
import { SubPageLayout } from '../../../components/SubPageLinks';
import { PageMenu } from '../../../components/PageMenu';

const PRESENSI_GURU_SUB_LINKS = [
  { key: 'rekap', label: 'Rekap Guru', path: '/tu/rekap-guru', icon: 'summarize', description: 'Rekap bulanan kehadiran guru' },
  { key: 'harian', label: 'Laporan Harian Guru', path: '/tu/laporan/harian-guru', icon: 'assessment', description: 'Laporan harian per guru' },
  { key: 'izin', label: 'Izin Guru', path: '/tu/izin-guru', icon: 'event_available', description: 'Antrean izin dan persetujuan' },
];

/** Baris harian dari GET /api/tu/presensi-guru/harian */
interface PresensiGuruRow {
  guruId: number;
  nama: string;
  email: string;
  status: 'HADIR' | 'TERLAMBAT' | 'ALPHA' | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  source: 'HP' | 'MANUAL' | 'KIOSK' | null;
  alasan: string | null;
}

function todayWIB(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });
}

const STATUS_VARIANT: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  HADIR: 'green',
  TERLAMBAT: 'yellow',
  ALPHA: 'red',
};

interface ManualFormState {
  guruId: number;
  nama: string;
  tanggal: string;
  status: 'HADIR' | 'TERLAMBAT' | 'ALPHA';
  checkInAt: string;
  checkOutAt: string;
  alasan: string;
}

/**
 * PresensiGuruPage — /tu/presensi-guru
 *
 * Monitor presensi guru harian (tanggal terpilih). Form input manual
 * di sheet adaptif — alasan wajib. POST /api/tu/presensi-guru/manual.
 */
export function PresensiGuruPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [tanggal, setTanggal] = useState(todayWIB());
  const [rows, setRows] = useState<PresensiGuruRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState<ManualFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminGetPresensiGuruHarian({ tanggal }) as { data: PresensiGuruRow[] };
      setRows(res.data ?? []);
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data presensi guru');
    } finally {
      setLoading(false);
    }
  }, [tanggal, show]);

  useEffect(() => { load(); }, [load]);

  const openManual = (row: PresensiGuruRow) => {
    setManual({
      guruId: row.guruId,
      nama: row.nama,
      tanggal,
      status: row.status ?? 'HADIR',
      checkInAt: row.checkInAt ? row.checkInAt.slice(11, 16) : '',
      checkOutAt: row.checkOutAt ? row.checkOutAt.slice(11, 16) : '',
      alasan: '',
    });
  };

  const handleSaveManual = async () => {
    if (!manual) return;
    if (!manual.alasan.trim()) {
      show('error', 'Alasan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        guruId: manual.guruId,
        tanggal: manual.tanggal,
        status: manual.status,
        alasan: manual.alasan,
      };
      // Convert HH:MM to ISO — combine with tanggal
      if (manual.checkInAt) {
        body.checkInAt = `${manual.tanggal}T${manual.checkInAt}:00+07:00`;
      }
      if (manual.checkOutAt) {
        body.checkOutAt = `${manual.tanggal}T${manual.checkOutAt}:00+07:00`;
      }
      await api.adminPostPresensiGuruManual(body as Parameters<typeof api.adminPostPresensiGuruManual>[0]);
      show('success', `Presensi manual ${manual.nama} disimpan`);
      setManual(null);
      load();
    } catch (err: unknown) {
      show('error', err instanceof ApiError ? err.message : 'Gagal menyimpan presensi manual');
    } finally {
      setSaving(false);
    }
  };

  const hadir = rows.filter((r) => r.status === 'HADIR' || r.status === 'TERLAMBAT').length;
  const alpha = rows.filter((r) => !r.status).length;

  return (
    <PageContainer size="xl">
      <div className="flex items-center justify-between gap-3 mb-2">
        <BackLink to="/tu" mobileButton={false} />
        <PageMenu menuTitle="Menu Presensi Guru" links={PRESENSI_GURU_SUB_LINKS} />
      </div>
      <SubPageLayout links={PRESENSI_GURU_SUB_LINKS}>
      {/* Manual sheet */}
      {manual && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-2xl md:rounded-2xl p-6 shadow-xl">
            <h3 className="font-heading font-semibold text-aam-text mb-1">
              Input Manual — {manual.nama}
            </h3>
            <p className="text-xs text-aam-text-muted mb-4">{manual.tanggal}</p>

            <label className="block text-xs font-medium text-aam-text-muted mb-1">Status</label>
            <select
              value={manual.status}
              onChange={(e) => setManual({ ...manual, status: e.target.value as ManualFormState['status'] })}
              className="w-full rounded-md border border-aam-border px-3 py-2 text-sm mb-3 outline-none focus:border-aam-green"
            >
              <option value="HADIR">HADIR</option>
              <option value="TERLAMBAT">TERLAMBAT</option>
              <option value="ALPHA">ALPHA</option>
            </select>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-aam-text-muted mb-1">Jam Masuk</label>
                <input type="time" value={manual.checkInAt} onChange={(e) => setManual({ ...manual, checkInAt: e.target.value })}
                  className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green" />
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-text-muted mb-1">Jam Pulang</label>
                <input type="time" value={manual.checkOutAt} onChange={(e) => setManual({ ...manual, checkOutAt: e.target.value })}
                  className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green" />
              </div>
            </div>

            <label className="block text-xs font-medium text-aam-text-muted mb-1">
              Alasan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="input-alasan-manual"
              value={manual.alasan}
              onChange={(e) => setManual({ ...manual, alasan: e.target.value })}
              rows={3}
              placeholder="Wajib diisi — mis. izin sakit, keterangan terlambat, dll."
              className="w-full rounded-md border border-aam-border px-3 py-2 text-sm mb-4 outline-none focus:border-aam-green resize-none"
            />

            <div className="flex gap-3">
              <button onClick={() => setManual(null)} className="flex-1 rounded-md border border-aam-border py-2 text-sm font-medium text-aam-text">Batal</button>
              <button
                id="btn-simpan-manual"
                onClick={handleSaveManual}
                disabled={saving}
                className="flex-1 rounded-md bg-aam-green py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Monitor Presensi Guru
          </h2>
          <p className="text-xs text-aam-text-muted">
            Rekap harian presensi mandiri wajah guru.
          </p>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex gap-3 text-sm">
            <span className="text-aam-green font-medium">{hadir} hadir</span>
            <span className="text-red-500 font-medium">{alpha} belum</span>
          </div>
        )}
      </div>

      {/* Date picker */}
      <Card icon="calendar_today">
        <label className="block text-xs font-medium text-aam-text-muted mb-1.5">Tanggal</label>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
        />
      </Card>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card flush icon="person_check" className="overflow-hidden ">
          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : rows.length === 0 ? (
            <EmptyState icon="person_check" message="Tidak ada data guru" />
          ) : (
            <table className="w-full text-sm" id="tabel-presensi-guru">
              <thead>
                <tr className="border-b border-aam-border bg-aam-surface text-left">
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Nama Guru</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Status</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Masuk</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Pulang</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Sumber</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.guruId} className="border-b border-aam-border last:border-0 hover:bg-aam-surface/50">
                    <td className="px-4 py-3 font-medium text-aam-text">{row.nama}</td>
                    <td className="px-4 py-3">
                      {row.status ? (
                        <Badge variant={STATUS_VARIANT[row.status] ?? 'gray'}>{row.status}</Badge>
                      ) : (
                        <Badge variant="gray">Belum</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-aam-text-muted">{fmtTime(row.checkInAt)}</td>
                    <td className="px-4 py-3 text-aam-text-muted">{fmtTime(row.checkOutAt)}</td>
                    <td className="px-4 py-3 text-aam-text-muted text-xs">{row.source ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        id={`btn-manual-${row.guruId}`}
                        onClick={() => openManual(row)}
                        className="rounded-md border border-aam-border px-3 py-1 text-xs font-medium text-aam-text hover:border-aam-green/40"
                      >
                        Manual
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-md bg-aam-border" />)
        ) : rows.length === 0 ? (
          <EmptyState icon="person_check" message="Tidak ada data guru" />
        ) : rows.map((row) => (
          <Card key={row.guruId} icon="person">
            <div
              className="flex items-start justify-between gap-3 mb-2 cursor-pointer"
              onClick={() => navigate(`/tu/presensi-guru/detail?guruId=${row.guruId}`)}
            >
              <div className="min-w-0">
                <p className="font-medium text-aam-text truncate">{row.nama}</p>
                <p className="text-xs text-aam-text-muted">
                  Masuk: {fmtTime(row.checkInAt)} · Pulang: {fmtTime(row.checkOutAt)}
                </p>
              </div>
              {row.status ? (
                <Badge variant={STATUS_VARIANT[row.status] ?? 'gray'}>{row.status}</Badge>
              ) : (
                <Badge variant="gray">Belum</Badge>
              )}
            </div>
            <button onClick={(e) => { e.stopPropagation(); openManual(row); }} className="w-full rounded-md border border-aam-border py-2 text-xs font-medium text-aam-text">
              Input Manual
            </button>
          </Card>
        ))}
      </div>
      </SubPageLayout>
    </PageContainer>
  );
}
