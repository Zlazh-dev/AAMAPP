import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { useToast } from '../../../components/Toast';
import { Skeleton } from '../../../components/Skeleton';
import {
  api,
  ApiError,
  GuruRosterResponse,
  GuruRosterSiswaEntry,
  StatusPresensi,
} from '../../../api/client';

const STATUS_CYCLE: StatusPresensi[] = ['H', 'S', 'I', 'A', 'T'];

const STATUS_META: Record<StatusPresensi, { label: string; variant: 'green' | 'yellow' | 'blue' | 'red' | 'purple' }> = {
  H: { label: 'Hadir', variant: 'green' },
  S: { label: 'Sakit', variant: 'blue' },
  I: { label: 'Izin', variant: 'yellow' },
  A: { label: 'Alpha', variant: 'red' },
  T: { label: 'Terlambat', variant: 'purple' },
};

/** WIB "hari ini" YYYY-MM-DD (sama implementasi seperti di MatriksPresensiSiswaPage). */
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

interface RosterDetailSheetProps {
  jadwalKbmId: number;
  mapel: string | null;
  tanggal: string;
  /** true bila `tanggal` = hari ini WIB — menentukan wajib-tidaknya alasan koreksi. */
  hariIni: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Detail roster (baca) + koreksi per siswa (admin, alasan wajib bila
 * tanggal ≠ hari ini — F2-SPEC kontrak: "admin boleh pasca-cutoff +
 * body.alasan wajib → audit"). Adaptif: desktop modal, mobile bottom sheet
 * (pola sama seperti bottom sheet lain di proyek — lihat KelasDetailPage).
 */
export function RosterDetailSheet({
  jadwalKbmId,
  mapel,
  tanggal,
  hariIni,
  onClose,
  onSaved,
}: RosterDetailSheetProps) {
  const { show } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GuruRosterResponse | null>(null);
  const [entries, setEntries] = useState<Map<number, StatusPresensi>>(new Map());
  const [alasan, setAlasan] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // FIX2-#5: force-reveal textarea alasan bila server membalas 400
  // wajib-alasan (bisa terjadi karena rollover tengah malam WIB —
  // sheet dibuka sebelum 00:00, disimpan sesudahnya).
  const [forceShowAlasan, setForceShowAlasan] = useState(false);

  // FIX2-#5: hitung ulang hari ini di setiap render — jangan andalkan
  // prop `hariIni` yang dibekukan parent saat render.
  const isToday = tanggal === todayWIB();
  // Textarea alasan tampil bila bukan hari ini ATAU server sudah
  // meminta alasan via 400.
  const showAlasan = !isToday || forceShowAlasan;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // FIX2-#7: Escape menutup sheet — HANYA bila !saving DAN !dirty
  // (SPEC-KANON anti-bug: dialog ber-input dirty dilarang tertutup
  // Esc begitu saja). Pola sama seperti ConfirmDialog/AdaptiveSelect.
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving && !dirty) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [saving, dirty, onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getGuruKbmRoster({ jadwalId: jadwalKbmId, tanggal })
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
        const m = new Map<number, StatusPresensi>();
        res.siswa.forEach((s) => m.set(s.siswaId, s.status));
        setEntries(m);
      })
      .catch((err) => {
        // FIX2-#3: cek cancelled sebelum setState/onClose — tutup sheet
        // saat request in-flight lalu gagal bisa menyebabkan toast nyasar
        // + onClose() basi pada komponen yang sudah unmount.
        if (cancelled) return;
        // FIX2-#4: fallback teks bila respons non-JSON (mis. 502 proxy).
        show(
          'error',
          err instanceof ApiError
            ? err.body?.message || 'Gagal memuat roster'
            : 'Gagal memuat roster',
        );
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jadwalKbmId, tanggal]);

  const cycleStatus = (siswaId: number) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const cur = next.get(siswaId) ?? 'H';
      const idx = STATUS_CYCLE.indexOf(cur);
      next.set(siswaId, STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!detail || saving) return;
    // FIX2-#5: hitung ulang todayWIB() di dalam handleSave — jangan
    // andalkan prop hariIni yang mungkin basi (rollover tengah malam).
    const nowToday = todayWIB();
    const needsAlasan = tanggal !== nowToday;
    if (needsAlasan && alasan.trim() === '') {
      setForceShowAlasan(true);
      show('error', 'Alasan koreksi wajib diisi untuk tanggal selain hari ini');
      return;
    }
    setSaving(true);
    try {
      const entri = Array.from(entries.entries()).map(([siswaId, status]) => ({ siswaId, status }));
      await api.koreksiGuruKbmRoster({
        jadwalId: jadwalKbmId,
        body: {
          tanggal,
          entri,
          alasan: needsAlasan ? alasan.trim() : undefined,
        },
      });
      show('success', 'Koreksi presensi berhasil disimpan');
      onSaved();
    } catch (err) {
      // FIX2-#5: bila server membalas 400 wajib-alasan (terjadi karena
      // rollover tengah malam WIB — parent kirim hariIni=true, tapi
      // server hitung tanggal ≠ hari ini), TAMPILKAN textarea alasan.
      if (err instanceof ApiError && err.status === 400) {
        const msg = typeof err.body?.message === 'string' ? err.body.message : '';
        if (msg.includes('alasan')) {
          setForceShowAlasan(true);
          show('error', msg);
          return;
        }
      }
      show(
        'error',
        err instanceof ApiError
          ? err.body?.message || 'Gagal menyimpan koreksi'
          : 'Gagal menyimpan koreksi',
      );
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className={isMobile ? 'px-5 pb-5 pt-2' : 'p-5'}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-aam-text">
            Roster {mapel ?? 'Sesi'} — {tanggal}
          </h3>
          {detail && (
            <p className="text-xs text-aam-text-muted mt-0.5">
              Kelas {detail.kelas ?? '—'} •{' '}
              {detail.tersimpan ? (
                <span className="text-aam-green">Sudah tersimpan</span>
              ) : (
                <span className="text-red-600">Belum tersimpan (default Hadir)</span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="text-aam-text-muted hover:text-aam-text p-1 -mr-1 -mt-1"
          aria-label="Tutup"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
            close
          </span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : detail && detail.siswa.length === 0 ? (
        <p className="text-sm text-aam-text-muted py-6 text-center">Tidak ada siswa di kelas ini</p>
      ) : (
        <div className="max-h-[45vh] overflow-y-auto border border-aam-border rounded-md divide-y divide-aam-border/50 mb-4">
          {detail?.siswa.map((s: GuruRosterSiswaEntry) => {
            const status = entries.get(s.siswaId) ?? s.status;
            const meta = STATUS_META[status];
            return (
              <button
                key={s.siswaId}
                type="button"
                onClick={() => cycleStatus(s.siswaId)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 min-h-[48px] text-left hover:bg-gray-50 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-aam-text truncate">{s.nama}</span>
                  <span className="block text-xs text-aam-text-muted">NIS: {s.nis}</span>
                </span>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </button>
            );
          })}
        </div>
      )}

      {showAlasan && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-aam-text-muted mb-1.5">
            Alasan koreksi (wajib — tanggal lampau)
          </label>
          <textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            rows={2}
            placeholder="Contoh: perbaikan salah input oleh guru"
            className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
          />
        </div>
      )}

      {detail && (
        <div className={['flex gap-2', isMobile ? 'flex-col-reverse' : 'justify-end'].join(' ')}>
          <Button variant="secondary" size={isMobile ? 'lg' : 'md'} onClick={onClose} disabled={saving} className={isMobile ? 'w-full' : ''}>
            Batal
          </Button>
          <Button size={isMobile ? 'lg' : 'md'} onClick={handleSave} loading={saving} className={isMobile ? 'w-full' : ''} icon="save">
            Simpan Koreksi
          </Button>
        </div>
      )}
    </div>
  );

  return createPortal(
    <>
      <style>{`body { overflow: hidden !important; }`}</style>
      <div
        className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in"
        onClick={() => !saving && onClose()}
      />
      {!isMobile && (
        <div
          className="fixed z-[10000] bg-white rounded-lg shadow-2xl w-[calc(100%-32px)] max-w-lg animate-fade-in"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          {content}
        </div>
      )}
      {isMobile && (
        <div
          className="fixed z-[10000] left-0 right-0 bottom-0 bg-white rounded-t-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          {content}
        </div>
      )}
    </>,
    document.body,
  );
}
