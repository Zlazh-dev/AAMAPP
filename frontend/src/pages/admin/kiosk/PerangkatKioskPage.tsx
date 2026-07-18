import React, { useState, useEffect, useCallback } from 'react';
import { ApiError, getToken } from '../../../api/client';
import { PageContainer } from '../../../components/PageContainer';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { useToast } from '../../../components/Toast';

// ────── Local fetch helper ──────
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

interface DeviceKiosk {
  id: number;
  nama: string;
  paired: boolean;
  isOnline: boolean;
  pairingCode: string | null;
  pairingExpiresAt: string | null;
  lastSeenAt: string | null;
  createdAt?: string;
}

interface CreateDeviceResult {
  id: number;
  nama: string;
  pairingCode: string;
  pairingExpiresAt: string;  // backend sends pairingExpiresAt
}

// ────── Component ──────

/**
 * PerangkatKioskPage — /admin/perangkat
 *
 * Daftar perangkat kiosk: nama, status pairing, isOnline.
 * Tombol "Tambah Perangkat" → kode pairing 6 digit besar (10 mnt).
 * Tombol "Cabut" → DELETE device.
 *
 * API methods (AG-1 perlu wire di client.ts):
 *   - adminGetDeviceKiosk()     → GET  /api/admin/device-kiosk
 *   - adminCreateDeviceKiosk()  → POST /api/admin/device-kiosk
 *   - adminDeleteDeviceKiosk()  → DELETE /api/admin/device-kiosk/:id
 */
export function PerangkatKioskPage() {
  const { show } = useToast();
  const [devices, setDevices] = useState<DeviceKiosk[]>([]);
  const [loading, setLoading] = useState(true);

  // Tambah perangkat form
  const [showAddForm, setShowAddForm] = useState(false);
  const [namaInput, setNamaInput] = useState('');
  const [adding, setAdding] = useState(false);

  // Kode pairing modal
  const [pairingResult, setPairingResult] = useState<CreateDeviceResult | null>(null);

  // Konfirmasi cabut
  const [cabuting, setCabuting] = useState<number | null>(null);
  const [confirmCabut, setConfirmCabut] = useState<DeviceKiosk | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const arr = await apiFetch<DeviceKiosk[]>('/admin/device-kiosk');
      setDevices(Array.isArray(arr) ? arr : []);
    } catch {
      show('error', 'Gagal memuat daftar perangkat kiosk');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!namaInput.trim()) {
      show('error', 'Nama perangkat wajib diisi');
      return;
    }
    setAdding(true);
    try {
      const result = await apiFetch<CreateDeviceResult>('/admin/device-kiosk', {
        method: 'POST',
        body: JSON.stringify({ nama: namaInput.trim() }),
      });
      setNamaInput('');
      setShowAddForm(false);
      setPairingResult(result);
      load();
    } catch (err: unknown) {
      show('error', err instanceof ApiError ? err.message : 'Gagal menambah perangkat');
    } finally {
      setAdding(false);
    }
  };

  const handleCabut = async (device: DeviceKiosk) => {
    setConfirmCabut(null);
    setCabuting(device.id);
    try {
      await apiFetch(`/admin/device-kiosk/${device.id}`, { method: 'DELETE' });
      show('success', `Perangkat "${device.nama}" berhasil dicabut`);
      load();
    } catch (err: unknown) {
      show('error', err instanceof ApiError ? err.message : 'Gagal mencabut perangkat');
    } finally {
      setCabuting(null);
    }
  };

  return (
    <PageContainer size="xl">
      {/* ── Kode Pairing Modal ── */}
      {pairingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-aam-green mb-2">devices</span>
            <h3 className="font-heading font-semibold text-aam-text text-lg mb-1">
              Perangkat Ditambahkan
            </h3>
            <p className="text-sm text-aam-text-muted mb-4">
              <strong>{pairingResult.nama}</strong> — masukkan kode ini di perangkat kiosk
              dalam <strong>10 menit</strong>:
            </p>
            <div
              id="pairing-code-display"
              className="text-5xl font-mono font-bold tracking-[0.25em] text-aam-green py-4 px-2 bg-aam-surface rounded-xl mb-2 select-all"
            >
              {pairingResult.pairingCode}
            </div>
            <p className="text-xs text-aam-text-muted mb-6">
              Kode kadaluarsa:{' '}
              {new Date(pairingResult.pairingExpiresAt).toLocaleTimeString('id-ID', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
              })} WIB
            </p>
            <button
              id="btn-tutup-pairing"
              onClick={() => setPairingResult(null)}
              className="w-full rounded-xl bg-aam-green py-3 text-sm font-semibold text-white"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* ── Konfirmasi Cabut ── */}
      {confirmCabut && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-t-2xl md:rounded-2xl p-6 shadow-xl">
            <h3 className="font-heading font-semibold text-aam-text mb-2">Cabut Perangkat?</h3>
            <p className="text-sm text-aam-text-muted mb-5">
              Token perangkat <strong>{confirmCabut.nama}</strong> akan dihapus.
              Perangkat perlu melakukan pairing ulang.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCabut(null)}
                className="flex-1 rounded-xl border border-aam-border py-2.5 text-sm font-medium text-aam-text"
              >
                Batal
              </button>
              <button
                id={`btn-konfirmasi-cabut-${confirmCabut.id}`}
                onClick={() => handleCabut(confirmCabut)}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white"
              >
                Cabut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Perangkat Kiosk
          </h2>
          <p className="text-xs text-aam-text-muted">
            Kelola perangkat kiosk presensi wajah guru.
          </p>
        </div>
        <button
          id="btn-tambah-perangkat"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-xl bg-aam-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Perangkat
        </button>
      </div>

      {/* ── Form Tambah ── */}
      {showAddForm && (
        <Card icon="device_hub" className="p-4 mb-4 border-aam-green/30">
          <h4 className="font-medium text-aam-text mb-3 text-sm">Perangkat Baru</h4>
          <div className="flex gap-3">
            <input
              id="input-nama-perangkat"
              type="text"
              placeholder="Nama perangkat (mis. Kamera Depan)"
              value={namaInput}
              onChange={(e) => setNamaInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 rounded-xl border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
            />
            <button
              onClick={() => { setShowAddForm(false); setNamaInput(''); }}
              className="rounded-xl border border-aam-border px-3 py-2.5 text-sm text-aam-text"
            >
              Batal
            </button>
            <button
              id="btn-simpan-perangkat"
              onClick={handleAdd}
              disabled={adding}
              className="rounded-xl bg-aam-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {adding ? 'Menambah…' : 'Tambah'}
            </button>
          </div>
        </Card>
      )}

      {/* ── Daftar Perangkat ── */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-aam-border" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <EmptyState icon="devices" message="Belum ada perangkat kiosk" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card icon="devices" className="overflow-hidden p-0">
              <table className="w-full text-sm" id="tabel-perangkat-kiosk">
                <thead>
                  <tr className="border-b border-aam-border bg-aam-surface text-left">
                    <th className="px-4 py-3 font-medium text-aam-text-muted">Nama Perangkat</th>
                    <th className="px-4 py-3 font-medium text-aam-text-muted">Status Pairing</th>
                    <th className="px-4 py-3 font-medium text-aam-text-muted">Koneksi</th>
                    <th className="px-4 py-3 font-medium text-aam-text-muted">Terakhir Online</th>
                    <th className="px-4 py-3 font-medium text-aam-text-muted text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.id} className="border-b border-aam-border last:border-0 hover:bg-aam-surface/50">
                      <td className="px-4 py-3 font-medium text-aam-text">{d.nama}</td>
                      <td className="px-4 py-3">
                        <Badge variant={d.paired ? 'green' : 'gray'}>
                          {d.paired ? 'Terpasang' : 'Belum Pair'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={d.isOnline ? 'green' : 'gray'}>
                          {d.isOnline ? 'Online' : 'Offline'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-aam-text-muted">
                        {d.lastSeenAt
                          ? new Date(d.lastSeenAt).toLocaleString('id-ID', {
                              timeZone: 'Asia/Jakarta',
                              day: '2-digit', month: 'short',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          id={`btn-cabut-${d.id}`}
                          onClick={() => setConfirmCabut(d)}
                          disabled={cabuting === d.id}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Cabut
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {devices.map((d) => (
              <Card key={d.id} icon="devices" className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-medium text-aam-text truncate">{d.nama}</p>
                    <p className="text-xs text-aam-text-muted mt-0.5">
                      {d.lastSeenAt
                        ? `Terakhir: ${new Date(d.lastSeenAt).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}`
                        : 'Belum pernah online'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant={d.paired ? 'green' : 'gray'}>
                      {d.paired ? 'Paired' : 'Unpaired'}
                    </Badge>
                    <Badge variant={d.isOnline ? 'green' : 'gray'}>
                      {d.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmCabut(d)}
                  disabled={cabuting === d.id}
                  className="w-full rounded-xl border border-red-200 py-2 text-xs font-medium text-red-600 disabled:opacity-50"
                >
                  Cabut Token
                </button>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
