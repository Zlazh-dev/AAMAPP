import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, JadwalKbm, Penugasan, Kelas, TahunAjaran , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { PageMenu } from '../../components/PageMenu';
import { BackLink } from '../../components/BackLink';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_NUM: Record<string, number> = { Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6 };

/**
 * /kurikulum/jadwal — Jadwal KBM (T15 §14.10.3).
 * Desktop: grid Senin-Sabtu × sesi.
 * Mobile: pemilih hari segmented ? daftar sesi vertikal.
 * No TA active ? panel arahan.
 * 409 bentrok tampil di dalam panel slot.
 * Badge total jam per guru di panel bantu.
 */
export function JadwalKbmPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [taAktif, setTaAktif] = useState<TahunAjaran | null>(null);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<number | null>(null);
  const [jadwalList, setJadwalList] = useState<JadwalKbm[]>([]);
  const [penugasanList, setPenugasanList] = useState<Penugasan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Senin'); // mobile
  const [slotPanel, setSlotPanel] = useState<{ hari: string; jamKe: number } | null>(null);
  const [slotPenugasanId, setSlotPenugasanId] = useState<number | null>(null);
  const [slotJamMulai, setSlotJamMulai] = useState('07:00');
  const [slotJamSelesai, setSlotJamSelesai] = useState('07:40');
  const [slotError, setSlotError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JadwalKbm | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ta = await api.getTahunAjaranAktif();
        if (cancelled) return;
        setTaAktif(ta);
        const kelasRes = await api.adminGetKelas({ limit: 1000 });
        if (cancelled) return;
        setKelasList(kelasRes.data);
        if (kelasRes.data.length > 0) {
          setSelectedKelas(kelasRes.data[0].id);
        }
      } catch (err) {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedKelas || !taAktif) return;
    let cancelled = false;
    (async () => {
      try {
        const [jadwal, penugasan] = await Promise.all([
          api.getJadwal({ kelasId: selectedKelas, taId: taAktif.id }),
          api.getPenugasan({ kelasId: selectedKelas, taId: taAktif.id }),
        ]);
        if (cancelled) return;
        setJadwalList(jadwal);
        setPenugasanList(penugasan);
      } catch (err) {
        if (!cancelled) toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat jadwal');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedKelas, taAktif]);

  // Badge: total jam per guru (load balancing check)
  const guruHours = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of jadwalList) {
      const key = j.guruNama;
      // Roughly count each slot as ~40 min = 0.67 hr
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [jadwalList]);

  // Group jadwal by hari
  const jadwalByHari = useMemo(() => {
    const map = new Map<string, JadwalKbm[]>();
    for (const h of HARI_LIST) map.set(h, []);
    for (const j of jadwalList) {
      const hariName = Object.entries(HARI_NUM).find(([, n]) => n === j.hari)?.[0];
      if (hariName) {
        map.get(hariName)?.push(j);
      }
    }
    // Sort by jamMulai within each day
    for (const h of HARI_LIST) {
      map.get(h)?.sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
    }
    return map;
  }, [jadwalList]);

  const handleSaveSlot = async () => {
    if (!slotPanel || !slotPenugasanId) return;
    setSaving(true);
    setSlotError(null);
    try {
      const hariNum = HARI_NUM[slotPanel.hari];
      await api.createJadwal({
        penugasanId: slotPenugasanId,
        hari: hariNum,
        jamMulai: slotJamMulai,
        jamSelesai: slotJamSelesai,
      });
      toast.show('success', 'Slot jadwal ditambahkan');
      setSlotPanel(null);
      setSlotPenugasanId(null);
      // Refresh
      if (selectedKelas && taAktif) {
        const jadwal = await api.getJadwal({ kelasId: selectedKelas, taId: taAktif.id });
        setJadwalList(jadwal);
      }
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan slot';
      if (msg.includes('409') || msg.includes('bentrok') || msg.includes('Conflict')) {
        setSlotError(`Bentrok: sudah ada jadwal di waktu ini. Periksa jam mulai/selesai.`);
      } else {
        setSlotError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteJadwal(deleteTarget.id);
      toast.show('success', 'Slot dihapus');
      setDeleteTarget(null);
      setJadwalList((prev) => prev.filter((j) => j.id !== deleteTarget.id));
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal menghapus slot');
    }
  };

  // No TA active ? panel arahan
  if (!loading && !taAktif) {
    return (
      <PageContainer size="xl">
        <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
          Jadwal KBM
        </h2>
        <Card className="text-center">
          <span className="material-symbols-outlined text-aam-text-muted mb-3" style={{ fontSize: '3rem' }}>
            calendar_off
          </span>
          <h3 className="text-sm font-medium text-aam-text mb-2">Belum ada tahun ajaran aktif</h3>
          <p className="text-xs text-aam-text-muted mb-4 max-w-sm mx-auto">
            Jadwal KBM memerlukan tahun ajaran aktif. Buat dan aktifkan tahun ajaran di Pengaturan.
          </p>
          <Button variant="secondary" size="sm" icon="settings" onClick={() => navigate('/kurikulum/tahun-ajaran-kkm')}>
            Buka Tahun Ajaran & KKM
          </Button>
        </Card>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer size="xl">
        <div className="mt-8 text-center text-sm text-aam-text-muted">Memuat…</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="xl">
      <BackLink to="/kurikulum/penugasan" />
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 mt-2">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Jadwal KBM
          </h2>
          <p className="text-xs text-aam-text-muted">
            {taAktif ? `TA ${taAktif.nama} Sem ${taAktif.semester}` : ''}
          </p>
        </div>
      </div>

      {/* Kelas selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-aam-text mb-1.5">Pilih Kelas</label>
        <select
          value={selectedKelas ?? ''}
          onChange={(e) => setSelectedKelas(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="w-full md:max-w-xs rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]"
        >
          {kelasList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4">
        {/* Jadwal area */}
        <div>
          {/* Mobile: Day picker */}
          <div className="md:hidden mb-4">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {HARI_LIST.map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedDay(h)}
                  className={[
                    'px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors min-h-[44px]',
                    selectedDay === h
                      ? 'bg-aam-green text-white'
                      : 'bg-aam-page text-aam-text-muted border border-aam-border',
                  ].join(' ')}
                >
                  {h.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: Vertical list for selected day */}
          <div className="md:hidden space-y-2">
            {(jadwalByHari.get(selectedDay) || []).map((j) => (
              <Card key={j.id} icon="schedule">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-aam-text">{j.mapelNama}</p>
                    <p className="text-xs text-aam-text-muted">{j.guruNama}</p>
                    <p className="text-xs text-aam-text-muted font-mono">{j.jamMulai}–{j.jamSelesai}</p>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(j)}
                    className="text-aam-text-muted hover:text-red-500 p-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
                  </button>
                </div>
              </Card>
            ))}
            <button
              onClick={() => setSlotPanel({ hari: selectedDay, jamKe: 1 })}
              className="w-full rounded-md border border-dashed border-aam-border py-3 text-sm text-aam-text-muted hover:bg-aam-page transition-colors min-h-[44px]"
            >
              + Tambah Slot
            </button>
          </div>

          {/* Desktop: Grid table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
                  <th className="pb-2 font-medium w-24">Jam</th>
                  {HARI_LIST.map((h) => (
                    <th key={h} className="pb-2 font-medium text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                {/* Render slots as rows by jamMulai */}
                {[...new Set(jadwalList.map((j) => j.jamMulai))].sort().map((jamMulai) => (
                  <tr key={jamMulai} className="border-b border-aam-border/50">
                    <td className="py-2 text-xs text-aam-text-muted font-mono whitespace-nowrap">{jamMulai}</td>
                    {HARI_LIST.map((h) => {
                      const slot = jadwalByHari.get(h)?.find((j) => j.jamMulai === jamMulai);
                      return (
                        <td key={h} className="py-2 px-1">
                          {slot ? (
                            <div
                              onClick={() => setDeleteTarget(slot)}
                              className="rounded-md bg-aam-page border border-aam-border p-2 cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                              <p className="text-xs font-medium text-aam-text">{slot.mapelNama}</p>
                              <p className="text-xs text-aam-text-muted">{slot.guruNama}</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSlotPanel({ hari: h, jamKe: 1 })}
                              className="w-full rounded-md border border-dashed border-aam-border py-2 text-xs text-aam-text-muted hover:bg-aam-page transition-colors min-h-[44px]"
                            >
                              +
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Add slot row */}
                <tr>
                  <td className="py-2 text-xs text-aam-text-muted">+</td>
                  {HARI_LIST.map((h) => (
                    <td key={h} className="py-2 px-1">
                      <button
                        onClick={() => setSlotPanel({ hari: h, jamKe: 1 })}
                        className="w-full rounded-md border border-dashed border-aam-border py-2 text-xs text-aam-text-muted hover:bg-aam-page transition-colors min-h-[44px]"
                      >
                        +
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel bantu: badge total jam per guru (load balancing) */}
        <div className="lg:block">
          <Card>
            <h3 className="text-xs font-medium text-aam-text mb-3">Beban per Guru</h3>
            {guruHours.length === 0 ? (
              <p className="text-xs text-aam-text-muted">Belum ada jadwal</p>
            ) : (
              <div className="space-y-2">
                {guruHours.map(([nama, count]) => (
                  <div key={nama} className="flex items-center justify-between">
                    <span className="text-xs text-aam-text truncate">{nama}</span>
                    <Badge variant={count > 6 ? 'red' : 'gray'}>{count} slot</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Slot panel (add new slot) */}
      {slotPanel && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/30" onClick={() => setSlotPanel(null)}>
          <div className="bg-white rounded-t-md md:rounded-md p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-heading font-semibold text-aam-text mb-4">
              Tambah Slot — {slotPanel.hari}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-aam-text mb-1.5">Paket Mengajar</label>
                <select
                  value={slotPenugasanId ?? ''}
                  onChange={(e) => setSlotPenugasanId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green min-h-[44px]"
                >
                  <option value="">Pilih paket…</option>
                  {penugasanList.map((p) => (
                    <option key={p.id} value={p.id}>{p.guruNama} — {p.mapelNama}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-aam-text mb-1.5">Jam Mulai</label>
                  <input
                    type="time"
                    value={slotJamMulai}
                    onChange={(e) => setSlotJamMulai(e.target.value)}
                    className="w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-aam-text mb-1.5">Jam Selesai</label>
                  <input
                    type="time"
                    value={slotJamSelesai}
                    onChange={(e) => setSlotJamSelesai(e.target.value)}
                    className="w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green min-h-[44px]"
                  />
                </div>
              </div>
              {slotError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-600 flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                  {slotError}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setSlotPanel(null)}>Batal</Button>
                <Button size="sm" onClick={handleSaveSlot} loading={saving} disabled={!slotPenugasanId} icon="save">Simpan</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Slot Jadwal"
        description={`Hapus ${deleteTarget?.mapelNama} (${deleteTarget?.jamMulai}–${deleteTarget?.jamSelesai})?`}
        confirmLabel="Hapus"
        onConfirm={handleDeleteSlot}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
