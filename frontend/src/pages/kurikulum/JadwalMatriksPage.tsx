import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, JamPelajaran, ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { BackLink } from '../../components/BackLink';
import { SearchSelect, SearchSelectOption } from '../../components/SearchSelect';
import { useToast } from '../../components/Toast';

/* ── types ──────────────────────────────────────────────────────── */
type SelEntry = {
  kode: string | null;
  guruNama: string;
  mapelNama: string;
  penugasanId: number;
  jadwalId: number;
  guruId: number;
};

type MatriksData = {
  hari: number;
  taId: number;
  jamSlots: Array<{ id: number; urutan: number; jamMulai: string; jamSelesai: string }>;
  kelas: Array<{ id: number; nama: string }>;
  sel: Record<string, SelEntry>;
};

const HARI_LIST: Array<{ label: string; num: number }> = [
  { label: 'Senin', num: 1 },
  { label: 'Selasa', num: 2 },
  { label: 'Rabu', num: 3 },
  { label: 'Kamis', num: 4 },
  { label: 'Jumat', num: 5 },
  { label: 'Sabtu', num: 6 },
];

// Kode warna berdasar kode guru (deterministik)
const GURU_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
];
function colorForGuru(guruId: number) {
  return GURU_COLORS[guruId % GURU_COLORS.length];
}

/**
 * /kurikulum/jadwal/matriks — Jadwal KBM (JADWAL-MATRIX spec)
 *
 * Desktop-only matriks: tab hari × (kelas kolom × jamSlot baris).
 * - Klik / drag untuk multi-select sel
 * - Floating toolbar: dropdown SearchSelect penugasan → Assign / Hapus
 * - Semua-atau-batal; konflik 409 tampil sebagai list di toast + inline
 */
export function JadwalMatriksPage() {
  const navigate = useNavigate();
  const toast = useToast();

  /* ── state ──────────────────────────────────────────────────── */
  const [hari, setHari] = useState(1); // 1=Senin default
  const [data, setData] = useState<MatriksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seleksi: Set<"kelasId:jamMulai">
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const dragging = useRef(false);
  const dragMode = useRef<'select' | 'deselect'>('select');
  const [isDragging, setIsDragging] = useState(false);

  // Toolbar
  const [penugasanId, setPenugasanId] = useState<number | null>(null);
  const [penugasanOptions, setPenugasanOptions] = useState<SearchSelectOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [jamMulai, setJamMulai] = useState('07:00');
  const [jamSelesai, setJamSelesai] = useState('07:40');
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Modal JP — edit
  const [editJp, setEditJp] = useState<MatriksData['jamSlots'][0] | null>(null);
  const [editJpMulai, setEditJpMulai] = useState('');
  const [editJpSelesai, setEditJpSelesai] = useState('');
  const [jpSaving, setJpSaving] = useState(false);
  const [jpError, setJpError] = useState<string | null>(null);

  // Modal JP — tambah
  const [showAddJp, setShowAddJp] = useState(false);
  const [addJpMulai, setAddJpMulai] = useState('');
  const [addJpSelesai, setAddJpSelesai] = useState('');


  /* ── load matriks ────────────────────────────────────────────── */
  const load = useCallback(async (h: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getJadwalMatriks(h);
      setData(res);
      setSelected(new Set());
      setConflicts([]);
    } catch (e) {
      setError('Gagal memuat data jadwal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(hari); }, [hari, load]);

  /* ── load penugasan options ──────────────────────────────────── */
  const searchPenugasan = useCallback(async (q: string): Promise<SearchSelectOption[]> => {
    const res = await api.getPenugasan({ limit: 50 });
    const opts: SearchSelectOption[] = res.data
      .filter((p) =>
        !q ||
        p.guruNama.toLowerCase().includes(q.toLowerCase()) ||
        p.mapelNama.toLowerCase().includes(q.toLowerCase()) ||
        p.kelasNama.toLowerCase().includes(q.toLowerCase()),
      )
      .map((p) => ({
        value: p.id,
        label: `${p.guruNama} — ${p.mapelNama} (${p.kelasNama})`,
      }));
    setPenugasanOptions(opts);
    return opts;
  }, []);

  /* ── drag selection ──────────────────────────────────────────── */
  function cellKey(kelasId: number, jamMulai: string) {
    return `${kelasId}:${jamMulai}`;
  }

  function toggleCell(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function onCellMouseDown(key: string, e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
    dragMode.current = selected.has(key) ? 'deselect' : 'select';
    setIsDragging(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode.current === 'select') next.add(key); else next.delete(key);
      return next;
    });
  }

  function onCellMouseEnter(key: string) {
    if (!dragging.current) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode.current === 'select') next.add(key); else next.delete(key);
      return next;
    });
  }

  useEffect(() => {
    const up = () => {
      dragging.current = false;
      setIsDragging(false);
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  /* ── assign ──────────────────────────────────────────────────── */
  async function handleAssign() {
    if (!penugasanId || selected.size === 0) return;
    if (!jamMulai || !jamSelesai) { toast.show('error', 'Isi jam mulai & selesai'); return; }

    // Cari kelasId dari setiap sel yang dipilih
    const slots = Array.from(selected).map((key) => {
      const [kelasIdStr] = key.split(':');
      return {
        kelasId: Number(kelasIdStr),
        penugasanId: penugasanId!,
        jamMulai,
        jamSelesai,
      };
    });

    setSaving(true);
    setConflicts([]);
    try {
      const res = await api.batchAssignJadwal({ hari, slots });
      toast.show('success', `${res.disimpan} slot jadwal disimpan.`);
      setSelected(new Set());
      setPenugasanId(null);
      await load(hari);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 409) {
        const body = e.body as { conflicts?: string[] };
        const cs = body?.conflicts ?? [];
        setConflicts(cs);
        toast.show('error', `Konflik jadwal — ${cs.length} slot ditolak`);
      } else {
        toast.show('error', 'Gagal menyimpan jadwal.');
      }
    } finally {
      setSaving(false);
    }
  }

  /* ── hapus ────────────────────────────────────────────────────── */
  async function handleHapus() {
    if (selected.size === 0 || !data) return;
    // Kumpulkan jadwalId dari sel yang terisi dan dipilih
    const ids: number[] = [];
    for (const key of selected) {
      const entry = data.sel[key];
      if (entry) ids.push(entry.jadwalId);
    }
    if (ids.length === 0) { toast.show('error', 'Tidak ada slot berisi yang dipilih.'); return; }

    setSaving(true);
    setConflicts([]);
    try {
      const res = await api.batchHapusJadwal(ids);
      toast.show('success', `${res.dihapus} slot jadwal dihapus.`);
      setSelected(new Set());
      await load(hari);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 409) {
        const body = e.body as { blocked?: string[] };
        const cs = body?.blocked ?? [];
        setConflicts(cs);
        toast.show('error', `Tidak dapat dihapus — ${cs.length} slot punya sesi presensi`);
      } else {
        toast.show('error', 'Gagal menghapus jadwal.');
      }
    } finally {
      setSaving(false);
    }
  }

  /* ── JP modal handlers ────────────────────────────────────────── */
  function openEditJp(jp: MatriksData['jamSlots'][0]) {
    setEditJp(jp);
    setEditJpMulai(jp.jamMulai);
    setEditJpSelesai(jp.jamSelesai);
    setJpError(null);
  }

  async function handleSaveJp() {
    if (!editJp) return;
    setJpSaving(true);
    setJpError(null);
    try {
      await api.updateJamPelajaran(editJp.id, { jamMulai: editJpMulai, jamSelesai: editJpSelesai });
      toast.show('success', `JP ${editJp.urutan} diperbarui. Semua jadwal hari ini ikut bergeser.`);
      setEditJp(null);
      await load(hari);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? (e.body?.message ?? e.message) : 'Gagal menyimpan JP';
      setJpError(msg);
    } finally {
      setJpSaving(false);
    }
  }

  function openAddJp() {
    // Prefill: mulai = selesai JP terakhir; durasi = durasi JP terakhir
    const slots = data?.jamSlots ?? [];
    if (slots.length > 0) {
      const last = slots[slots.length - 1];
      const lastDurMin =
        last.jamSelesai.split(':').reduce((a, b, i) => a + (i === 0 ? +b * 60 : +b), 0) -
        last.jamMulai.split(':').reduce((a, b, i) => a + (i === 0 ? +b * 60 : +b), 0);
      const mulaiMin = last.jamSelesai.split(':').reduce((a, b, i) => a + (i === 0 ? +b * 60 : +b), 0);
      const selesaiMin = mulaiMin + lastDurMin;
      const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      setAddJpMulai(fmt(mulaiMin));
      setAddJpSelesai(fmt(selesaiMin));
    } else {
      setAddJpMulai('07:00');
      setAddJpSelesai('07:40');
    }
    setJpError(null);
    setShowAddJp(true);
  }

  async function handleAddJp() {
    setJpSaving(true);
    setJpError(null);
    try {
      await api.addJamPelajaran({ hari, jamMulai: addJpMulai, jamSelesai: addJpSelesai });
      toast.show('success', 'JP baru ditambahkan');
      setShowAddJp(false);
      await load(hari);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? (e.body?.message ?? e.message) : 'Gagal menambah JP';
      setJpError(msg);
    } finally {
      setJpSaving(false);
    }
  }

  /* ── derived ──────────────────────────────────────────────────── */
  const selectedCount = selected.size;
  const selectedFilledCount = data
    ? Array.from(selected).filter((k) => data.sel[k]).length
    : 0;
  const selectedEmptyCount = selectedCount - selectedFilledCount;


  /* ── render ───────────────────────────────────────────────────── */
  return (
    <PageContainer>
      <div className="mb-6">
        <BackLink to="/kurikulum/jadwal" label="← Jadwal KBM" />
        <h1 className="text-xl font-bold text-aam-text mt-2">Matriks Jadwal KBM</h1>
        <p className="text-sm text-aam-text-muted mt-1">
          Klik atau geser untuk memilih sel — lalu assign penugasan atau hapus
        </p>
      </div>

      {/* Tab hari */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {HARI_LIST.map((h) => (
          <button
            key={h.num}
            onClick={() => { setHari(h.num); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              hari === h.num
                ? 'bg-aam-green text-white border-aam-green'
                : 'bg-white text-aam-text border-aam-border hover:border-aam-green/50'
            }`}
          >
            {h.label}
          </button>
        ))}
      </div>

      {/* Floating toolbar (muncul bila ada seleksi) */}
      {selectedCount > 0 && (
        <div className="sticky top-4 z-30 mb-4">
          <div className="bg-white border border-aam-border rounded-lg shadow-lg p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-aam-text-muted mb-1">
                Penugasan (Guru — Mapel — Kelas)
              </label>
              <SearchSelect
                options={penugasanOptions}
                value={penugasanId}
                onChange={(v) => setPenugasanId(v as number | null)}
                onSearch={searchPenugasan}
                placeholder="Cari guru / mapel..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-aam-text-muted mb-1">Jam Mulai</label>
              <input
                type="time"
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                className="border border-aam-border rounded-md px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-aam-green"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-aam-text-muted mb-1">Jam Selesai</label>
              <input
                type="time"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
                className="border border-aam-border rounded-md px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-aam-green"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-aam-text-muted">
                {selectedCount} sel dipilih
                {selectedEmptyCount > 0 && ` (${selectedEmptyCount} kosong)`}
                {selectedFilledCount > 0 && ` (${selectedFilledCount} berisi)`}
              </span>
              <Button
                variant="primary"
                size="sm"
                disabled={!penugasanId || selectedEmptyCount === 0 || saving}
                onClick={handleAssign}
              >
                {saving ? 'Menyimpan…' : `Assign (${selectedEmptyCount})`}
              </Button>
              {selectedFilledCount > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={saving}
                  onClick={handleHapus}
                >
                  {saving ? 'Menghapus…' : `Hapus (${selectedFilledCount})`}
                </Button>
              )}
              <button
                onClick={() => { setSelected(new Set()); setConflicts([]); }}
                className="text-xs text-aam-text-muted hover:text-aam-text px-2 py-1 rounded"
              >
                Batal pilih
              </button>
            </div>
          </div>

          {/* Konflik inline */}
          {conflicts.length > 0 && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-700 mb-1">
                ⚠ Konflik ({conflicts.length}):
              </p>
              <ul className="space-y-0.5">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-xs text-red-600">• {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Matriks */}
      {loading ? (
        <div className="text-center py-16 text-aam-text-muted">Memuat jadwal…</div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : !data || data.kelas.length === 0 ? (
        <div className="text-center py-16 text-aam-text-muted">
          Belum ada kelas. Tambah kelas terlebih dahulu.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-aam-border shadow-sm select-none">
          <table
            className="min-w-full border-collapse"
            style={{ userSelect: 'none' }}
          >
            <thead>
              <tr className="bg-aam-page">
                <th className="border-b border-r border-aam-border px-3 py-2.5 text-xs font-semibold text-aam-text-muted text-left whitespace-nowrap sticky left-0 bg-aam-page z-10 min-w-[100px]">
                  Jam
                </th>
                {data.kelas.map((k) => (
                  <th
                    key={k.id}
                    className="border-b border-r border-aam-border px-3 py-2.5 text-xs font-semibold text-aam-text text-center whitespace-nowrap min-w-[130px]"
                  >
                    {k.nama}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.jamSlots.length === 0 && (
                <tr>
                  <td
                    colSpan={data.kelas.length + 1}
                    className="text-center py-10 text-aam-text-muted text-sm"
                  >
                    Belum ada slot jadwal hari {HARI_LIST.find((h) => h.num === hari)?.label}.
                    <br />
                    <span className="text-xs">Pilih sel di bawah dan assign penugasan untuk mulai.</span>
                  </td>
                </tr>
              )}

              {/* Baris per jam slot dari jam_pelajaran */}
              {data.jamSlots.map((slot, rowIdx) => (
                <tr
                  key={slot.jamMulai}
                  className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-aam-page/50'}
                >
                  {/* Kolom jam — klik untuk edit JP */}
                  <td
                    className="border-b border-r border-aam-border px-3 py-2 text-xs text-aam-text-muted whitespace-nowrap sticky left-0 bg-inherit z-10 cursor-pointer hover:bg-aam-green/5 group"
                    onClick={() => openEditJp(slot)}
                    title="Klik untuk edit jam JP"
                  >
                    <span className="font-medium">{slot.urutan}.</span>{' '}
                    {slot.jamMulai}–{slot.jamSelesai}
                    <span className="ml-1 opacity-0 group-hover:opacity-60 text-[9px]">✏</span>
                  </td>
                  {data.kelas.map((k) => {
                    const key = cellKey(k.id, slot.jamMulai);
                    const entry = data.sel[key];
                    const isSelected = selected.has(key);
                    return (
                      <MatriksCell
                        key={k.id}
                        cellKey={key}
                        entry={entry}
                        isSelected={isSelected}
                        isDragging={isDragging}
                        onMouseDown={onCellMouseDown}
                        onMouseEnter={onCellMouseEnter}
                      />
                    );
                  })}
                </tr>
              ))}

              {/* Baris + JP */}
              <tr className="bg-white border-t border-dashed border-aam-border/60">
                <td
                  colSpan={data.kelas.length + 1}
                  className="px-3 py-1.5 text-center"
                >
                  <button
                    onClick={openAddJp}
                    className="text-xs text-aam-green hover:text-aam-green/80 font-medium flex items-center gap-1 mx-auto"
                  >
                    <span className="text-base leading-none">+</span> JP
                    {data.jamSlots.length > 0 && (
                      <span className="text-aam-text-muted font-normal">
                        (JP sebelumnya selesai {data.jamSlots[data.jamSlots.length - 1].jamSelesai})
                      </span>
                    )}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda */}
      {data && data.kelas.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-aam-text-muted">Legenda warna guru:</span>
          {Array.from(
            new Map(
              Object.values(data.sel).map((e) => [e.guruId, { guruNama: e.guruNama, kode: e.kode }]),
            ).entries(),
          ).map(([guruId, { guruNama, kode }]) => (
            <span
              key={guruId}
              className={`text-xs px-2 py-0.5 rounded border font-medium ${colorForGuru(guruId)}`}
            >
              {kode ?? '?'} — {guruNama}
            </span>
          ))}
        </div>
      )}
      {/* Modal Edit JP */}
      {editJp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-aam-text mb-1">Edit JP {editJp.urutan}</h3>
            <p className="text-xs text-aam-text-muted mb-4">
              Mengubah jam akan menggeser semua jadwal hari ini di slot ini.
            </p>
            {jpError && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{jpError}</div>
            )}
            {data && data.jamSlots.length > 1 && (() => {
              const idx = data.jamSlots.findIndex((s) => s.id === editJp.id);
              const prev = idx > 0 ? data.jamSlots[idx - 1] : null;
              const next = idx < data.jamSlots.length - 1 ? data.jamSlots[idx + 1] : null;
              return (
                <div className="mb-3 text-xs text-aam-text-muted space-y-0.5">
                  {prev && <div>JP {prev.urutan} sebelumnya: {prev.jamMulai}–{prev.jamSelesai}</div>}
                  {next && <div>JP {next.urutan} sesudahnya: {next.jamMulai}–{next.jamSelesai}</div>}
                </div>
              );
            })()}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-aam-text-muted mb-1">Jam Mulai</label>
                <input type="time" value={editJpMulai} onChange={(e) => setEditJpMulai(e.target.value)}
                  className="w-full border border-aam-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-aam-green" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-aam-text-muted mb-1">Jam Selesai</label>
                <input type="time" value={editJpSelesai} onChange={(e) => setEditJpSelesai(e.target.value)}
                  className="w-full border border-aam-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-aam-green" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditJp(null)} className="text-sm text-aam-text-muted px-3 py-1.5 rounded hover:bg-aam-page">Batal</button>
              <Button variant="primary" size="sm" disabled={jpSaving} onClick={handleSaveJp}>
                {jpSaving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah JP */}
      {showAddJp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-aam-text mb-1">Tambah JP</h3>
            {data && data.jamSlots.length > 0 && (
              <p className="text-xs text-aam-text-muted mb-3">
                JP sebelumnya selesai {data.jamSlots[data.jamSlots.length - 1].jamSelesai}
              </p>
            )}
            {jpError && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{jpError}</div>
            )}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-aam-text-muted mb-1">Jam Mulai</label>
                <input type="time" value={addJpMulai} onChange={(e) => setAddJpMulai(e.target.value)}
                  className="w-full border border-aam-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-aam-green" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-aam-text-muted mb-1">Jam Selesai</label>
                <input type="time" value={addJpSelesai} onChange={(e) => setAddJpSelesai(e.target.value)}
                  className="w-full border border-aam-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-aam-green" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddJp(false)} className="text-sm text-aam-text-muted px-3 py-1.5 rounded hover:bg-aam-page">Batal</button>
              <Button variant="primary" size="sm" disabled={jpSaving} onClick={handleAddJp}>
                {jpSaving ? 'Menyimpan…' : 'Tambah JP'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

type MatriksCellProps = {
  cellKey: string;
  entry: SelEntry | undefined;
  isSelected: boolean;
  isDragging: boolean;
  onMouseDown: (key: string, e: React.MouseEvent) => void;
  onMouseEnter: (key: string) => void;
};

function MatriksCell({ cellKey, entry, isSelected, onMouseDown, onMouseEnter }: MatriksCellProps) {
  const guruColor = entry ? colorForGuru(entry.guruId) : '';

  return (
    <td
      onMouseDown={(e) => onMouseDown(cellKey, e)}
      onMouseEnter={() => onMouseEnter(cellKey)}
      className={`border-b border-r border-aam-border px-1.5 py-1 text-center align-middle cursor-pointer transition-colors ${
        isSelected
          ? 'ring-2 ring-inset ring-aam-green bg-aam-green/10'
          : 'hover:bg-aam-green/5'
      }`}
    >
      {entry ? (
        <div
          className={`rounded px-1.5 py-1 border text-left ${guruColor} ${isSelected ? 'opacity-90' : ''}`}
        >
          <div className="text-[11px] font-bold leading-tight">{entry.kode ?? '?'}</div>
          <div className="text-[10px] leading-tight truncate max-w-[110px]">{entry.mapelNama}</div>
        </div>
      ) : (
        <div className={`h-8 rounded ${isSelected ? 'bg-aam-green/20' : 'bg-transparent'}`} />
      )}
    </td>
  );
}


