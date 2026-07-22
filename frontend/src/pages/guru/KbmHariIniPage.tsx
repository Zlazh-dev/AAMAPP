import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

/** WIB "hari ini" dalam format YYYY-MM-DD. */
function todayWIB(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

type HadirState = 'idle' | 'loading' | 'ok' | 'error';

interface SesiItem {
  jadwalKbmId: number;
  mapel: string;
  kelas: string;
  jamMulai: string;
  jamSelesai: string;
  sesiKe: number;
  status: 'TERLAKSANA' | 'BELUM';
  hadirPada: string | null;
}

/**
 * KbmHariIniPage — /guru/kbm
 *
 * Daftar sesi KBM guru hari ini. Setiap sesi memiliki tombol "Hadir & Mulai"
 * yang memvalidasi geofence sebelum membuka roster.
 *
 * Alur:
 * 1. Guru tekan "Hadir & Mulai" → ambil GPS → POST /api/guru/kbm/:id/hadir
 * 2. Backend validasi geofence → 200 (ok) atau 403 (luar radius + jarak)
 * 3. Sukses → navigasi ke /guru/roster/:id?tanggal=...
 * 4. Sesi yang sudah hadir tampil badge "Sudah hadir" + boleh buka roster langsung
 *
 * Roster TIDAK bisa dibuka tanpa hadir (hadirPada === null).
 */
export function KbmHariIniPage({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState<string>(todayWIB());
  const [sesiList, setSesiList] = useState<SesiItem[]>([]);
  const [libur, setLibur] = useState(false);
  const [keteranganLibur, setKeteranganLibur] = useState<string | null>(null);

  // Status "Hadir & Mulai" per jadwalKbmId
  const [hadirState, setHadirState] = useState<Record<number, HadirState>>({});
  const [hadirError, setHadirError] = useState<Record<number, string>>({});

  const isHariIni = tanggal === todayWIB();

  const loadKbm = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getGuruKbm({ tanggal });
      setSesiList((result.sesi ?? []) as SesiItem[]);
      setLibur(result.libur ?? false);
      setKeteranganLibur(result.keteranganLibur ?? null);
      // Reset hadir state saat tanggal berubah
      setHadirState({});
      setHadirError({});
    } catch {
      show('error', 'Gagal memuat data KBM hari ini');
      setSesiList([]);
    } finally {
      setLoading(false);
    }
  }, [tanggal, show]);

  useEffect(() => { loadKbm(); }, [loadKbm]);

  /**
   * Klik "Hadir & Mulai":
   * 1. Ambil GPS
   * 2. POST hadir → validasi geofence backend
   * 3. Sukses → navigasi ke roster
   */
  const handleHadir = async (sesi: SesiItem) => {
    setHadirState((p) => ({ ...p, [sesi.jadwalKbmId]: 'loading' }));
    setHadirError((p) => ({ ...p, [sesi.jadwalKbmId]: '' }));

    // Ambil GPS
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          enableHighAccuracy: true,
        }),
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code;
      if (code === 1) {
        // Izin ditolak — lanjut tanpa koordinat (geofence mungkin nonaktif)
        lat = undefined;
        lng = undefined;
      } else {
        setHadirState((p) => ({ ...p, [sesi.jadwalKbmId]: 'error' }));
        setHadirError((p) => ({ ...p, [sesi.jadwalKbmId]: 'GPS timeout — pastikan lokasi aktif' }));
        return;
      }
    }

    // POST hadir
    try {
      await api.guruHadirSesi({
        jadwalId: sesi.jadwalKbmId,
        lat,
        lng,
        tanggal,
      });
      // Update hadirPada lokal agar badge langsung berubah
      setSesiList((prev) =>
        prev.map((s) =>
          s.jadwalKbmId === sesi.jadwalKbmId
            ? { ...s, hadirPada: new Date().toISOString() }
            : s,
        ),
      );
      setHadirState((p) => ({ ...p, [sesi.jadwalKbmId]: 'ok' }));
      // Navigasi ke roster
      navigate(`/guru/roster/${sesi.jadwalKbmId}?tanggal=${tanggal}`);
    } catch (err: unknown) {
      setHadirState((p) => ({ ...p, [sesi.jadwalKbmId]: 'error' }));
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Gagal mencatat kehadiran';
      setHadirError((p) => ({ ...p, [sesi.jadwalKbmId]: msg }));
    }
  };

  /** Buka roster sesi yang sudah hadir (tanpa validasi ulang). */
  const handleBukaRoster = (sesi: SesiItem) => {
    navigate(`/guru/roster/${sesi.jadwalKbmId}?tanggal=${tanggal}`);
  };

  const inner = (
    <>
      {!embedded && (
        <div className="mb-4">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            KBM Hari Ini
          </h2>
          <p className="text-xs text-aam-text-muted">
            Tekan "Hadir & Mulai" untuk mencatat kehadiran dan membuka roster presensi siswa.
          </p>
        </div>
      )}

      <Card icon="event" className="mb-4">
        <label className="block text-xs font-medium text-aam-text-muted mb-1.5">Tanggal</label>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="w-full max-w-xs rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
        />
      </Card>

      {libur && keteranganLibur && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          <span className="material-symbols-outlined text-base">celebration</span>
          Hari Libur: {keteranganLibur}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-md" />
          ))}
        </div>
      ) : sesiList.length === 0 ? (
        <Card icon="calendar_today">
          <EmptyState icon="calendar_today" message="Tidak ada jadwal KBM untuk tanggal ini" />
        </Card>
      ) : (
        <div className="space-y-3">
          {sesiList.map((sesi) => {
            const sudahHadir = !!sesi.hadirPada;
            const isLoading = hadirState[sesi.jadwalKbmId] === 'loading';
            const errMsg = hadirError[sesi.jadwalKbmId];

            return (
              <Card
                key={sesi.jadwalKbmId}
                icon={sesi.status === 'TERLAKSANA' ? 'check_circle' : 'radio_button_unchecked'}
                className="p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-aam-text truncate">
                      {sesi.mapel} — {sesi.kelas}
                    </h3>
                    <p className="text-xs text-aam-text-muted mt-0.5">
                      Jam {sesi.jamMulai}–{sesi.jamSelesai} • Sesi ke-{sesi.sesiKe}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={sesi.status === 'TERLAKSANA' ? 'green' : 'yellow'}>
                      {sesi.status === 'TERLAKSANA' ? 'Sudah presensi' : 'Belum presensi'}
                    </Badge>
                    {sudahHadir && (
                      <Badge variant="green">
                        <span className="material-symbols-outlined text-[10px] mr-0.5">location_on</span>
                        Sudah hadir
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Error lokasi */}
                {errMsg && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-3 py-2">
                    {errMsg}
                  </div>
                )}

                {/* Tombol aksi */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {sudahHadir ? (
                    // Sudah hadir — buka roster langsung
                    <button
                      id={`btn-buka-roster-${sesi.jadwalKbmId}`}
                      onClick={() => handleBukaRoster(sesi)}
                      className="flex items-center gap-1.5 rounded-md bg-aam-green px-4 py-2 text-sm font-medium text-white hover:bg-aam-green/90 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-base">groups</span>
                      {sesi.status === 'TERLAKSANA' ? 'Lihat / koreksi presensi' : 'Isi presensi'}
                    </button>
                  ) : isHariIni ? (
                    // Belum hadir & ini hari ini → tampil tombol Hadir & Mulai
                    <button
                      id={`btn-hadir-mulai-${sesi.jadwalKbmId}`}
                      onClick={() => handleHadir(sesi)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 rounded-md bg-aam-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-aam-green/90 active:scale-95 transition-transform"
                    >
                      {isLoading ? (
                        <>
                          <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                          Memeriksa lokasi…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">location_on</span>
                          Hadir &amp; Mulai
                        </>
                      )}
                    </button>
                  ) : (
                    // Tanggal lampau — langsung buka roster (tidak perlu hadir sesi)
                    <button
                      id={`btn-buka-roster-lampau-${sesi.jadwalKbmId}`}
                      onClick={() => handleBukaRoster(sesi)}
                      className="flex items-center gap-1.5 rounded-md border border-aam-border px-4 py-2 text-sm font-medium text-aam-text hover:border-aam-green/40 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-base">edit_note</span>
                      {sesi.status === 'TERLAKSANA' ? 'Lihat / koreksi' : 'Isi presensi (lampau)'}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) return inner;
  return <PageContainer size="xl" backLinkMobile={false}>{inner}</PageContainer>;
}

export default KbmHariIniPage;
