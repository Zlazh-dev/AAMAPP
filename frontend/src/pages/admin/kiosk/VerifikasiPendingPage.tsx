import React, { useState, useEffect, useCallback } from 'react';
import { ApiError, getToken } from '../../../api/client';
import { PageContainer } from '../../../components/PageContainer';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { useToast } from '../../../components/Toast';

// ────── Local fetch helper (reuse auth token, avoid client.ts body mismatch) ──────
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api${url}`, { ...options, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

// ────── Types ──────

interface PendingRow {
  id: number;
  guruId: number;
  nama: string | null;   // 'guruNama' alias handled below
  tanggal: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: 'HADIR' | 'TERLAMBAT' | 'ALPHA';
  source: 'HP' | 'MANUAL' | 'KIOSK';
  similarity: number | null;
  alasan: string | null;
}

type VerifikasiAksi = 'terima' | 'tolak';

// ────── Helpers ──────

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });
}

const STATUS_VARIANT: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  HADIR: 'green', TERLAMBAT: 'yellow', ALPHA: 'red',
};

// ────── Verifikasi sheet state ──────
interface VerifState {
  row: PendingRow;
  aksi: VerifikasiAksi | null;
  status: 'HADIR' | 'TERLAMBAT' | 'ALPHA';
  alasan: string;
}

/**
 * VerifikasiPendingPage — /admin/presensi-guru-pending (atau tab di /admin/presensi-guru)
 *
 * Daftar presensi guru yang perluVerifikasi=true (dari kiosk: ambigu / NIP manual).
 * Admin dapat: terima (dengan override status opsional) atau tolak (hapus record).
 *
 * API methods (AG-1 perlu wire di client.ts):
 *   - adminGetPresensiGuruPending()        → GET  /api/admin/presensi-guru/pending
 *   - adminPostPresensiGuruVerifikasi()    → POST /api/admin/presensi-guru/:id/verifikasi
 */
export function VerifikasiPendingPage() {
  const { show } = useToast();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [verif, setVerif] = useState<VerifState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ total: number; data: any[] }>('/admin/presensi-guru/pending');
      const arr: PendingRow[] = (res?.data ?? []).map((r: any) => ({
        ...r,
        nama: r.nama ?? r.guruNama ?? null,
        source: r.source ?? 'KIOSK',
        similarity: r.similarity ?? null,
        alasan: r.alasan ?? null,
        checkOutAt: r.checkOutAt ?? null,
      }));
      setRows(arr);
    } catch {
      show('error', 'Gagal memuat data pending verifikasi');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const openVerif = (row: PendingRow, aksi: VerifikasiAksi) => {
    setVerif({ row, aksi, status: row.status, alasan: '' });
  };

  const handleVerif = async () => {
    if (!verif) return;
    if (verif.aksi === 'tolak' && !verif.alasan.trim()) {
      show('error', 'Alasan wajib diisi untuk penolakan');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { aksi: verif.aksi };
      if (verif.aksi === 'terima') body.status = verif.status;
      if (verif.alasan.trim()) body.alasan = verif.alasan;
      await apiFetch(`/admin/presensi-guru/${verif.row.id}/verifikasi`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      show(
        'success',
        verif.aksi === 'terima'
          ? `Presensi ${verif.row.nama} diterima`
          : `Presensi ${verif.row.nama} ditolak`,
      );
      setVerif(null);
      load();
    } catch (err: unknown) {
      show('error', err instanceof ApiError ? err.message : 'Gagal memproses verifikasi');
    } finally {
      setSaving(false);
    }
  };

  const totalPending = rows.length;

  return (
    <PageContainer size="xl">
      {/* ── Verifikasi Sheet ── */}
      {verif && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-2xl md:rounded-2xl p-6 shadow-xl">
            <h3 className="font-heading font-semibold text-aam-text mb-1">
              {verif.aksi === 'terima' ? 'Terima Presensi' : 'Tolak Presensi'}
            </h3>
            <p className="text-xs text-aam-text-muted mb-4">
              {verif.row.nama} — {verif.row.tanggal}{' '}
              <span className="text-aam-text-muted">({verif.row.source})</span>
            </p>

            {verif.aksi === 'terima' && (
              <>
                <label className="block text-xs font-medium text-aam-text-muted mb-1">Status</label>
                <select
                  id="select-status-verif"
                  value={verif.status}
                  onChange={(e) => setVerif({ ...verif, status: e.target.value as VerifState['status'] })}
                  className="w-full rounded-xl border border-aam-border px-3 py-2.5 text-sm mb-4 outline-none focus:border-aam-green"
                >
                  <option value="HADIR">HADIR</option>
                  <option value="TERLAMBAT">TERLAMBAT</option>
                  <option value="ALPHA">ALPHA</option>
                </select>
              </>
            )}

            <label className="block text-xs font-medium text-aam-text-muted mb-1">
              Keterangan{verif.aksi === 'tolak' && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              id="input-alasan-verif"
              value={verif.alasan}
              onChange={(e) => setVerif({ ...verif, alasan: e.target.value })}
              rows={3}
              placeholder={verif.aksi === 'tolak' ? 'Alasan penolakan (wajib)' : 'Catatan opsional'}
              className="w-full rounded-xl border border-aam-border px-3 py-2 text-sm mb-4 outline-none focus:border-aam-green resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setVerif(null)}
                className="flex-1 rounded-xl border border-aam-border py-2.5 text-sm font-medium text-aam-text"
              >
                Batal
              </button>
              <button
                id={`btn-${verif.aksi}-verif`}
                onClick={handleVerif}
                disabled={saving}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
                  verif.aksi === 'tolak' ? 'bg-red-500' : 'bg-aam-green'
                }`}
              >
                {saving
                  ? 'Memproses…'
                  : verif.aksi === 'terima'
                  ? 'Terima'
                  : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Verifikasi Presensi Pending
          </h2>
          <p className="text-xs text-aam-text-muted">
            Presensi dari kiosk yang ambigu atau input NIP manual — perlu konfirmasi.
          </p>
        </div>
        {!loading && totalPending > 0 && (
          <Badge variant="yellow">{totalPending} menunggu</Badge>
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block">
        <Card icon="fact_check" className="overflow-hidden p-0">
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : rows.length === 0 ? (
            <EmptyState icon="fact_check" message="Tidak ada presensi yang perlu diverifikasi" />
          ) : (
            <table className="w-full text-sm" id="tabel-pending-verifikasi">
              <thead>
                <tr className="border-b border-aam-border bg-aam-surface text-left">
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Nama Guru</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Tanggal</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Masuk</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Status</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Sumber</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-aam-border last:border-0 hover:bg-aam-surface/50">
                    <td className="px-4 py-3 font-medium text-aam-text">{row.nama ?? '—'}</td>
                    <td className="px-4 py-3 text-aam-text-muted">{row.tanggal}</td>
                    <td className="px-4 py-3 text-aam-text-muted">{fmtTime(row.checkInAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[row.status] ?? 'gray'}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-aam-text-muted">{row.source}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          id={`btn-terima-${row.id}`}
                          onClick={() => openVerif(row, 'terima')}
                          className="rounded-lg border border-aam-green/40 px-3 py-1 text-xs font-medium text-aam-green hover:bg-aam-green/10"
                        >
                          Terima
                        </button>
                        <button
                          id={`btn-tolak-${row.id}`}
                          onClick={() => openVerif(row, 'tolak')}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-aam-border" />)
        ) : rows.length === 0 ? (
          <EmptyState icon="fact_check" message="Tidak ada presensi yang perlu diverifikasi" />
        ) : rows.map((row) => (
          <Card key={row.id} icon="person_check" className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-medium text-aam-text truncate">{row.nama ?? '—'}</p>
                <p className="text-xs text-aam-text-muted">
                  {row.tanggal} · {fmtTime(row.checkInAt)} · {row.source}
                </p>
                {row.alasan && (
                  <p className="text-xs text-aam-text-muted mt-0.5 italic truncate">
                    {row.alasan}
                  </p>
                )}
              </div>
              <Badge variant={STATUS_VARIANT[row.status] ?? 'gray'}>{row.status}</Badge>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => openVerif(row, 'terima')}
                className="flex-1 rounded-xl border border-aam-green/40 py-2 text-xs font-medium text-aam-green"
              >
                Terima
              </button>
              <button
                onClick={() => openVerif(row, 'tolak')}
                className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-medium text-red-600"
              >
                Tolak
              </button>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
