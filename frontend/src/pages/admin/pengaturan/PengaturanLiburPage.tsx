import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api, ApiError, type LiburEntry } from '../../../api/client';
import { BackLink } from '../../../components/BackLink';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { PageContainer } from '../../../components/PageContainer';

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Rentang tanggal [mulai, selesai] inklusif ? daftar string YYYY-MM-DD. */
function dateRange(mulai: string, selesai: string): string[] {
  const out: string[] = [];
  const start = new Date(mulai + 'T00:00:00');
  const end = new Date(selesai + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return out;
  const cur = new Date(start);
  while (cur <= end && out.length < 62) {
    out.push(formatDate(cur.getFullYear(), cur.getMonth(), cur.getDate()));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Selisih hari kalender antara dua tanggal YYYY-MM-DD (b - a). */
function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((db - da) / 86400000);
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Format satu tanggal YYYY-MM-DD ? "16 Jul 2026" (manusiawi, bukan ISO). */
function humanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_SHORT[m - 1]} ${y}`;
}

/**
 * Format rentang [awal, akhir] ? tampilan manusiawi ringkas.
 * Satu hari: "16 Jul 2026". Sama bulan/tahun: "16–18 Jul 2026".
 * Lintas bulan (tahun sama): "30 Jul – 2 Agu 2026". Lintas tahun: tampil penuh keduanya.
 */
function humanDateRange(awal: string, akhir: string): string {
  if (awal === akhir) return humanDate(awal);
  const [ya, ma, da] = awal.split('-').map(Number);
  const [yb, mb, db] = akhir.split('-').map(Number);
  if (ya === yb && ma === mb) return `${da}–${db} ${MONTH_SHORT[ma - 1]} ${ya}`;
  if (ya === yb) return `${da} ${MONTH_SHORT[ma - 1]} – ${db} ${MONTH_SHORT[mb - 1]} ${ya}`;
  return `${humanDate(awal)} – ${humanDate(akhir)}`;
}

export interface LiburRentang {
  /** Kunci unik untuk React key & aksi (awal tanggal + keterangan). */
  key: string;
  awal: string;
  akhir: string;
  keterangan: string;
  /** Semua tanggal individual dalam rentang ini (untuk aksi hapus bulk). */
  tanggalList: string[];
  jumlahHari: number;
}

/**
 * T15-FIX-2 (REVISI 1): kelompokkan entri libur PER-TANGGAL (dari DB, TIDAK
 * berubah) menjadi RENTANG untuk tampilan saja — tanggal BERURUTAN (selisih 1
 * hari) dengan keterangan SAMA digabung jadi satu baris. Fungsi murni, tidak
 * menyentuh state/DB.
 */
function groupLiburRentang(list: LiburEntry[]): LiburRentang[] {
  const sorted = [...list].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const out: LiburRentang[] = [];
  let current: { awal: string; akhir: string; keterangan: string; tanggalList: string[] } | null = null;

  for (const entry of sorted) {
    if (
      current &&
      current.keterangan === entry.keterangan &&
      diffDays(current.akhir, entry.tanggal) === 1
    ) {
      current.akhir = entry.tanggal;
      current.tanggalList.push(entry.tanggal);
    } else {
      if (current) {
        out.push({
          key: `${current.awal}__${current.keterangan}`,
          ...current,
          jumlahHari: current.tanggalList.length,
        });
      }
      current = { awal: entry.tanggal, akhir: entry.tanggal, keterangan: entry.keterangan, tanggalList: [entry.tanggal] };
    }
  }
  if (current) {
    out.push({
      key: `${current.awal}__${current.keterangan}`,
      ...current,
      jumlahHari: current.tanggalList.length,
    });
  }
  return out;
}

/**
 * /tu/rekap-guru/libur — kalender libur sekolah (T14 ? T15-FIX rev.2).
 * SELEKSI-MULTI lalu AKSI (KEPUTUSAN USER): klik tanggal = toggle seleksi
 * (tanpa membuka dialog langsung); bar aksi muncul di bawah kalender saat
 * seleksi = 1; "+ Rentang" menambah rentang tanggal ke seleksi; impor +
 * deteksi otomatis libur nasional.
 */
export function PengaturanLiburPage({ embedded = false }: { embedded?: boolean } = {}) {
  const toast = useToast();
  const [liburList, setLiburList] = useState<LiburEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Seleksi-multi
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialog: tandai libur (keterangan)
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dialog: hapus penanda (confirm — seleksi-multi)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Dialog: hapus SATU baris rentang dari daftar "Libur bulan ini" (T15-FIX-2)
  const [rentangDeleteTarget, setRentangDeleteTarget] = useState<LiburRentang | null>(null);

  // Dialog: + Rentang
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // Impor libur nasional
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const [importList, setImportList] = useState<{ tanggal: string; keterangan: string; sudahAda: boolean }[]>([]);
  const [importChecked, setImportChecked] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Deteksi otomatis (banner)
  const [nasionalBaru, setNasionalBaru] = useState(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const liburMap = useMemo(() => new Map(liburList.map((l) => [l.tanggal, l])), [liburList]);

  // T15-FIX-2 (REVISI 1): daftar "Libur bulan ini" ditampilkan sebagai RENTANG
  // (bukan per-tanggal) — data DB tetap per-tanggal, pengelompokan hanya di sini.
  const bulanIniPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const rentangBulanIni = useMemo(
    () => groupLiburRentang(liburList.filter((l) => l.tanggal.startsWith(bulanIniPrefix))),
    [liburList, bulanIniPrefix],
  );

  const fetchLibur = useCallback(async () => {
    try {
      const list = await api.adminListLibur();
      setLiburList(list);
    } catch (err) {
      toast.show('error', 'Gagal memuat kalender libur');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchLibur(); }, [fetchLibur]);

  // Deteksi otomatis diam-diam saat halaman dibuka (non-blocking; gagal = diam)
  useEffect(() => {
    api.adminCekLiburNasional()
      .then((res) => setNasionalBaru(res.baru))
      .catch(() => { /* diam — jangan mengganggu */ });
  }, []);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Klik tanggal = TOGGLE SELEKSI (bukan langsung dialog) — KEPUTUSAN USER rev.2
  const handleDateClick = (day: number) => {
    if (!day) return;
    const dateStr = formatDate(year, month, day);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectedArr = useMemo(() => Array.from(selected).sort(), [selected]);
  const selectedBelumLibur = useMemo(() => selectedArr.filter((d) => !liburMap.has(d)), [selectedArr, liburMap]);
  const selectedSudahLibur = useMemo(() => selectedArr.filter((d) => liburMap.has(d)), [selectedArr, liburMap]);

  const handleAddRange = () => {
    if (!rangeStart || !rangeEnd) {
      toast.show('error', 'Tanggal mulai dan selesai wajib diisi');
      return;
    }
    const range = dateRange(rangeStart, rangeEnd);
    if (range.length === 0) {
      toast.show('error', 'Rentang tanggal tidak valid');
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      range.forEach((d) => next.add(d));
      return next;
    });
    setRangeDialogOpen(false);
    setRangeStart('');
    setRangeEnd('');
    toast.show('success', `${range.length} tanggal ditambahkan ke seleksi`);
  };

  const handleOpenMarkDialog = () => {
    setKeterangan('');
    setMarkDialogOpen(true);
  };

  const handleConfirmMark = async () => {
    if (!keterangan.trim()) {
      toast.show('error', 'Keterangan wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.adminBulkLibur({
        tanggal: selectedBelumLibur,
        keterangan: keterangan.trim(),
        aksi: 'tandai',
      });
      toast.show('success', `${res.dibuat ?? 0} tanggal ditandai libur${res.dilewati ? ` (${res.dilewati} dilewati)` : ''}`);
      setMarkDialogOpen(false);
      clearSelection();
      await fetchLibur();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menandai libur';
      toast.show('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSubmitting(true);
    try {
      const res = await api.adminBulkLibur({ tanggal: selectedSudahLibur, aksi: 'hapus' });
      toast.show('success', `${res.dihapus ?? 0} penanda libur dihapus`);
      setDeleteDialogOpen(false);
      clearSelection();
      await fetchLibur();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus penanda';
      toast.show('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // T15-FIX-2: hapus SATU baris rentang di daftar "Libur bulan ini" — aksi
  // berlaku SELURUH rentang tanggalnya via /libur/bulk (aksi: 'hapus').
  const handleConfirmRentangDelete = async () => {
    if (!rentangDeleteTarget) return;
    try {
      const res = await api.adminBulkLibur({ tanggal: rentangDeleteTarget.tanggalList, aksi: 'hapus' });
      toast.show('success', `${res.dihapus ?? 0} tanggal libur dihapus`);
      setRentangDeleteTarget(null);
      await fetchLibur();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus libur';
      toast.show('error', msg);
    }
  };

  const openImportDialog = async (yearOverride?: number) => {
    const y = yearOverride ?? importYear;
    setImportYear(y);
    setImportDialogOpen(true);
    setImportLoading(true);
    setImportError(null);
    try {
      const list = await api.adminImporLiburNasional(y);
      setImportList(list);
      setImportChecked(new Set(list.filter((l) => !l.sudahAda).map((l) => l.tanggal)));
    } catch (err) {
      setImportError('Sumber data tidak terjangkau — coba lagi atau isi manual.');
      setImportList([]);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    const toImport = importList.filter((l) => importChecked.has(l.tanggal) && !l.sudahAda);
    if (toImport.length === 0) {
      setImportDialogOpen(false);
      return;
    }
    setImportSubmitting(true);
    try {
      // Grouped by keterangan is not needed — bulk endpoint takes ONE
      // keterangan for the whole batch, but each holiday has its own name.
      // Import them individually via createLibur to preserve each name,
      // then refresh. (Small n; acceptable — admin action, not hot path.)
      for (const item of toImport) {
        try {
          await api.adminCreateLibur({ tanggal: item.tanggal, keterangan: item.keterangan });
        } catch (err) {
          // skip duplicates/conflicts silently within the loop
        }
      }
      toast.show('success', `${toImport.length} libur nasional diimpor`);
      setImportDialogOpen(false);
      setNasionalBaru(0);
      await fetchLibur();
    } catch (err) {
      toast.show('error', 'Gagal mengimpor sebagian libur nasional');
    } finally {
      setImportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer size="xl">
        {!embedded && <BackLink to="/tu/pengaturan" />}
        <div className="mt-8 text-center text-sm text-aam-text-muted">Memuat…</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg" bottomBar={!embedded && selected.size > 0}>
      {!embedded && <BackLink to="/tu/pengaturan" mobileButton={selected.size === 0} />}
      <div className="flex items-start justify-between gap-3 mt-4 mb-1 flex-wrap">
        <div>
          {!embedded && <h2 className="text-lg font-heading font-semibold text-aam-text mb-1">Kalender Libur</h2>}
          {!embedded && <p className="text-xs text-aam-text-muted">Klik tanggal untuk memilih, lalu gunakan bar aksi di bawah</p>}
        </div>
        <Button variant="secondary" size="sm" icon="cloud_download" onClick={() => openImportDialog()}>
          Impor Libur Nasional
        </Button>
      </div>

      {/* Banner deteksi otomatis */}
      {nasionalBaru > 0 && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-600 mt-0.5" style={{ fontSize: '1.125rem' }}>info</span>
            <p className="text-xs text-blue-800">
              Terdeteksi <strong>{nasionalBaru}</strong> libur nasional belum ada di kalender.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => openImportDialog()}>Tinjau &amp; Impor</Button>
        </div>
      )}

      <Card icon="calendar_month">
        {/* Month navigation + Rentang */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-md hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Bulan sebelumnya">
            <span className="material-symbols-outlined text-aam-text">chevron_left</span>
          </button>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-aam-text">{MONTH_NAMES[month]} {year}</h3>
            <button onClick={goToday} className="text-xs text-aam-green hover:underline mt-0.5">Hari ini</button>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-md hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Bulan berikutnya">
            <span className="material-symbols-outlined text-aam-text">chevron_right</span>
          </button>
        </div>

        <div className="flex justify-end mb-3">
          <Button
            variant="secondary"
            size="sm"
            icon="date_range"
            onClick={() => { setRangeStart(''); setRangeEnd(''); setRangeDialogOpen(true); }}
          >
            + Rentang
          </Button>
        </div>

        {/* Day header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-aam-text-muted py-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (!day) return <div key={i} className="aspect-square" />;
            const dateStr = formatDate(year, month, day);
            const libur = liburMap.get(dateStr);
            // TU-PENGATURAN A: Minggu (getDay()===0) selalu merah — derivasi, bukan data DB.
            const isSunday = new Date(year, month, day).getDay() === 0;
            const isLibur = !!libur || isSunday;
            const isToday = dateStr === todayStr;
            const isSelected = selected.has(dateStr);
            return (
              <button
                key={i}
                data-testid={`libur-day-${dateStr}`}
                onClick={() => handleDateClick(day)}
                className={[
                  'aspect-square rounded-md text-sm transition-colors relative',
                  'flex flex-col items-center justify-center',
                  isLibur
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'hover:bg-gray-100 text-aam-text',
                  isToday && !isLibur ? 'ring-1 ring-aam-green/40' : '',
                  isSelected ? 'ring-2 ring-aam-green bg-aam-green/10' : '',
                ].join(' ')}
                title={libur?.keterangan ?? (isSunday ? 'Minggu' : undefined)}
              >
                <span className="font-medium">{day}</span>
                {isLibur && <span className="material-symbols-outlined text-red-500" style={{ fontSize: '0.75rem' }}>event_busy</span>}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-aam-border flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-50 border border-red-200" />
            <span className="text-xs text-aam-text-muted">Libur</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded ring-1 ring-aam-green/40" />
            <span className="text-xs text-aam-text-muted">Hari ini</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded ring-2 ring-aam-green bg-aam-green/10" />
            <span className="text-xs text-aam-text-muted">Terpilih</span>
          </div>
        </div>

        {/* List of libur in current month — T15-FIX-2: ditampilkan sebagai RENTANG */}
        {rentangBulanIni.length > 0 && (
          <div className="mt-4 pt-4 border-t border-aam-border">
            <h4 className="text-xs font-semibold text-aam-text mb-2">Libur bulan ini:</h4>
            <ul className="space-y-1">
              {rentangBulanIni.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-2 text-xs text-aam-text-muted py-1.5 px-2 rounded hover:bg-gray-50 group">
                  <span>
                    <strong className="text-aam-text">{humanDateRange(r.awal, r.akhir)}</strong>
                    {' — '}{r.keterangan}
                    {r.jumlahHari > 1 && <span className="text-aam-text-muted"> ({r.jumlahHari} hari)</span>}
                  </span>
                  <button
                    onClick={() => setRentangDeleteTarget(r)}
                    className="opacity-0 group-hover:opacity-100 md:opacity-100 p-1.5 rounded hover:bg-red-50 text-aam-text-muted hover:text-red-600 transition-opacity flex-shrink-0"
                    aria-label={`Hapus libur ${humanDateRange(r.awal, r.akhir)}`}
                    title="Hapus"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* BAR AKSI — muncul saat seleksi = 1 (sticky bawah mobile via PageContainer bottomBar) */}
      {selected.size > 0 && (
        <div className="fixed md:sticky bottom-0 left-0 right-0 md:left-auto md:right-auto z-[500] bg-white border-t md:border md:rounded-md border-aam-border shadow-lg md:shadow-sm p-4 mt-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm font-medium text-aam-text">{selected.size} tanggal terpilih</span>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={clearSelection}>Batal</Button>
            {selectedSudahLibur.length > 0 && (
              <Button variant="danger" size="sm" icon="event_busy" onClick={() => setDeleteDialogOpen(true)}>
                Hapus Penanda ({selectedSudahLibur.length})
              </Button>
            )}
            {selectedBelumLibur.length > 0 && (
              <Button size="sm" icon="event_available" onClick={handleOpenMarkDialog}>
                Tandai Libur ({selectedBelumLibur.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Dialog: Tandai Libur — DILARANG window.prompt (§15.0) */}
      {markDialogOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/40" onClick={() => !submitting && setMarkDialogOpen(false)}>
          <div className="bg-white rounded-t-md md:rounded-md w-full md:max-w-sm p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-aam-text mb-1">Tandai Libur</h3>
            <p className="text-xs text-aam-text-muted mb-4">
              {selectedBelumLibur.length} tanggal terpilih
              {selectedBelumLibur.length <= 3
                ? `: ${selectedBelumLibur.join(', ')}`
                : `, contoh: ${selectedBelumLibur.slice(0, 3).join(', ')}…`}
            </p>
            <label className="block text-sm font-medium text-aam-text mb-1.5" htmlFor="libur-keterangan">Keterangan (untuk semua tanggal ini)</label>
            <input
              id="libur-keterangan"
              type="text"
              autoFocus
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmMark(); }}
              className={inputClass}
              placeholder="cth. Libur akhir semester"
              maxLength={150}
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => setMarkDialogOpen(false)} disabled={submitting}>Batal</Button>
              <Button size="sm" icon="event_available" onClick={handleConfirmMark} loading={submitting} disabled={!keterangan.trim()}>Simpan</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Dialog: + Rentang */}
      {rangeDialogOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/40" onClick={() => setRangeDialogOpen(false)}>
          <div className="bg-white rounded-t-md md:rounded-md w-full md:max-w-sm p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-aam-text mb-1">Tambah Rentang ke Seleksi</h3>
            <p className="text-xs text-aam-text-muted mb-4">Cocok untuk libur panjang UAS/UTS/akhir tahun — maksimal 62 hari.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-aam-text mb-1.5" htmlFor="range-start">Mulai</label>
                <input id="range-start" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-aam-text mb-1.5" htmlFor="range-end">Selesai</label>
                <input id="range-end" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => setRangeDialogOpen(false)}>Batal</Button>
              <Button size="sm" icon="add" onClick={handleAddRange} disabled={!rangeStart || !rangeEnd}>Tambahkan ke Seleksi</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Confirm: Hapus Penanda */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title={`Hapus ${selectedSudahLibur.length} penanda libur?`}
        description="Tanggal yang dihapus penandanya akan kembali menjadi hari aktif (kewajiban presensi berlaku lagi)."
        confirmLabel="Hapus Penanda"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      {/* Confirm: Hapus SATU baris rentang di daftar "Libur bulan ini" (T15-FIX-2) */}
      <ConfirmDialog
        open={!!rentangDeleteTarget}
        title={rentangDeleteTarget ? `Hapus libur ${humanDateRange(rentangDeleteTarget.awal, rentangDeleteTarget.akhir)}?` : ''}
        description={
          rentangDeleteTarget && rentangDeleteTarget.jumlahHari > 1
            ? `Seluruh ${rentangDeleteTarget.jumlahHari} hari dalam rentang ini akan dihapus penandanya dan kembali menjadi hari aktif.`
            : 'Tanggal ini akan kembali menjadi hari aktif (kewajiban presensi berlaku lagi).'
        }
        confirmLabel="Hapus"
        variant="danger"
        onConfirm={handleConfirmRentangDelete}
        onCancel={() => setRentangDeleteTarget(null)}
      />

      {/* Dialog: Impor Libur Nasional (pratinjau) */}
      {importDialogOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/40" onClick={() => !importSubmitting && setImportDialogOpen(false)}>
          <div className="bg-white rounded-t-md md:rounded-md w-full md:max-w-md p-5 shadow-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-aam-text">Impor Libur Nasional</h3>
              <select
                value={importYear}
                onChange={(e) => openImportDialog(parseInt(e.target.value, 10))}
                className="text-sm border border-aam-border rounded-md px-2 py-1"
              >
                {[importYear - 1, importYear, importYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-aam-text-muted mb-3">Pilih tanggal yang ingin ditambahkan ke kalender. Yang sudah ada dinonaktifkan.</p>

            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              {importLoading && (
                <div className="text-center text-sm text-aam-text-muted py-6">Memuat…</div>
              )}
              {!importLoading && importError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  {importError}
                </div>
              )}
              {!importLoading && !importError && importList.length === 0 && (
                <div className="text-center text-sm text-aam-text-muted py-6">Tidak ada data libur nasional untuk tahun ini.</div>
              )}
              {!importLoading && !importError && importList.length > 0 && (
                <ul className="space-y-1">
                  {importList.map((item) => (
                    <li key={item.tanggal} className={['flex items-center gap-2 px-2 py-2 rounded-md text-sm', item.sudahAda ? 'opacity-50' : 'hover:bg-gray-50'].join(' ')}>
                      <input
                        type="checkbox"
                        disabled={item.sudahAda}
                        checked={importChecked.has(item.tanggal)}
                        onChange={(e) => {
                          setImportChecked((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(item.tanggal); else next.delete(item.tanggal);
                            return next;
                          });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="flex-1">
                        <strong className="text-aam-text">{item.tanggal}</strong> — {item.keterangan}
                      </span>
                      {item.sudahAda && <span className="text-xs text-aam-text-muted">sudah ada</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-aam-border">
              <Button variant="secondary" size="sm" onClick={() => setImportDialogOpen(false)} disabled={importSubmitting}>Batal</Button>
              <Button
                size="sm"
                icon="cloud_download"
                onClick={handleConfirmImport}
                loading={importSubmitting}
                disabled={importLoading || !!importError || importChecked.size === 0}
              >
                Konfirmasi ({importChecked.size})
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </PageContainer>
  );
}
