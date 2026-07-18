import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

type JenisPenilaian = 'Formatif' | 'Sumatif';
type SubJenis = 'SUMATIF_TP' | 'SUMATIF_AKHIR_SEMESTER' | 'SUMATIF_AKHIR_TAHUN';

interface PenilaianEntry {
  id: number;
  nama: string;
  jenis: JenisPenilaian;
  subjenis: SubJenis | null;
  bobot: number;
  tanggal: string;
}

interface TpEntry { id: number; deskripsi: string; urutan: number; }

const JENIS_VARIANT: Record<JenisPenilaian, 'blue' | 'purple'> = {
  Formatif: 'blue',
  Sumatif: 'purple',
};

function todayWIB(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

export function PenilaianListPage() {
  const { penugasanId } = useParams<{ penugasanId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<PenilaianEntry[]>([]);
  const [tpList, setTpList] = useState<TpEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nama, setNama] = useState('');
  const [jenis, setJenis] = useState<JenisPenilaian>('Formatif');
  const [subjenis, setSubjenis] = useState<SubJenis | ''>('');
  const [bobot, setBobot] = useState<number>(1);
  const [tanggal, setTanggal] = useState(todayWIB());
  const [selectedTpIds, setSelectedTpIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, tpRes] = await Promise.all([
        (api as any).getPenilaianList?.(Number(penugasanId)),
        (api as any).getTpList?.(Number(penugasanId)),
      ]);
      setRows(pRes?.data ?? pRes ?? []);
      setTpList((tpRes?.data ?? tpRes ?? []).filter((t: TpEntry & { aktif?: boolean }) => t.aktif !== false));
    } catch {
      toast.show('error', 'Gagal memuat daftar penilaian.');
    } finally {
      setLoading(false);
    }
  }, [penugasanId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditId(null);
    setNama('');
    setJenis('Formatif');
    setSubjenis('');
    setBobot(1);
    setTanggal(todayWIB());
    setSelectedTpIds([]);
    setSheetOpen(true);
  };

  const openEdit = (p: PenilaianEntry) => {
    setEditId(p.id);
    setNama(p.nama);
    setJenis(p.jenis);
    setSubjenis(p.subjenis ?? '');
    setBobot(p.bobot);
    setTanggal(p.tanggal);
    setSelectedTpIds([]);
    setSheetOpen(true);
  };

  const toggleTp = (id: number) => {
    setSelectedTpIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!nama.trim()) { toast.show('error', 'Nama penilaian wajib diisi.'); return; }
    if (!bobot || bobot < 1) { toast.show('error', 'Bobot minimal 1.'); return; }
    if (!tanggal) { toast.show('error', 'Tanggal wajib diisi.'); return; }
    if (jenis === 'Sumatif' && !subjenis) { toast.show('error', 'Pilih sub-jenis sumatif.'); return; }
    setSaving(true);
    try {
      const body: any = {
        nama: nama.trim(),
        jenis,
        bobot,
        tanggal,
        ...(jenis === 'Sumatif' && subjenis ? { subjenis } : {}),
        ...(subjenis === 'SUMATIF_TP' && selectedTpIds.length ? { tpIds: selectedTpIds } : {}),
      };
      if (editId) {
        await (api as any).updatePenilaian?.(editId, body);
        toast.show('success', 'Penilaian diperbarui.');
        setSheetOpen(false);
        load();
      } else {
        const res = await (api as any).createPenilaian?.(Number(penugasanId), body);
        const newId = res?.id ?? res?.data?.id;
        toast.show('success', 'Penilaian dibuat. Lanjut input nilai.');
        setSheetOpen(false);
        if (newId) navigate(`/guru/penilaian/nilai/${newId}`);
        else load();
      }
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan penilaian.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus penilaian ini?')) return;
    try {
      await (api as any).deletePenilaian?.(id);
      toast.show('success', 'Penilaian dihapus.');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menghapus.');
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-aam-text">Daftar Penilaian</h3>
        <Button onClick={openAdd} id="btn-tambah-penilaian">+ Tambah Penilaian</Button>
      </div>

      {loading ? <TableSkeleton rows={3} /> : rows.length === 0 ? (
        <EmptyState icon="assignment" message="Belum ada penilaian. Klik '+ Tambah Penilaian' untuk membuat." />
      ) : (
        <div className="space-y-2">
          {rows.map(p => (
            <div key={p.id} id={`penilaian-item-${p.id}`}><Card>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-aam-text">{p.nama}</span>
                    <Badge variant={JENIS_VARIANT[p.jenis]}>{p.jenis}</Badge>
                    {p.subjenis && <Badge variant="gray">{p.subjenis.replace(/_/g, ' ')}</Badge>}
                  </div>
                  <p className="text-xs text-aam-muted mt-1">Bobot: {p.bobot} · {p.tanggal}</p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button
                    onClick={() => navigate(`/guru/penilaian/nilai/${p.id}`)}
                    id={`btn-input-nilai-${p.id}`}
                  >
                    Input Nilai
                  </Button>
                  <Button variant="secondary" onClick={() => openEdit(p)} id={`btn-edit-p-${p.id}`}>Edit</Button>
                  <Button variant="secondary" onClick={() => handleDelete(p.id)} id={`btn-delete-p-${p.id}`}>Hapus</Button>
                </div>
              </div>
            </Card></div>
          ))}
        </div>
      )}

      {/* Inline sheet */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-aam-text text-lg mb-4">
              {editId ? 'Edit Penilaian' : 'Tambah Penilaian'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Nama Penilaian *</label>
                <input className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  value={nama} onChange={e => setNama(e.target.value)}
                  placeholder="Contoh: UH Bab 1, Sumatif Tengah Semester..." id="input-nama-penilaian" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-aam-muted mb-1">Jenis *</label>
                  <select className="w-full rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
                    value={jenis} onChange={e => { setJenis(e.target.value as JenisPenilaian); setSubjenis(''); }}
                    id="select-jenis-penilaian">
                    <option value="Formatif">Formatif</option>
                    <option value="Sumatif">Sumatif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-aam-muted mb-1">Bobot *</label>
                  <input type="number" min={1} className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                    value={bobot} onChange={e => setBobot(Number(e.target.value))} id="input-bobot-penilaian" />
                </div>
              </div>
              {jenis === 'Sumatif' && (
                <div>
                  <label className="block text-xs font-medium text-aam-muted mb-1">Sub-Jenis Sumatif *</label>
                  <select className="w-full rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
                    value={subjenis} onChange={e => setSubjenis(e.target.value as SubJenis)}
                    id="select-subjenis-penilaian">
                    <option value="">-- Pilih Sub-Jenis --</option>
                    <option value="SUMATIF_TP">Sumatif TP</option>
                    <option value="SUMATIF_AKHIR_SEMESTER">Sumatif Akhir Semester</option>
                    <option value="SUMATIF_AKHIR_TAHUN">Sumatif Akhir Tahun</option>
                  </select>
                </div>
              )}
              {subjenis === 'SUMATIF_TP' && tpList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-aam-muted mb-1">TP yang Dinilai</label>
                  <div className="space-y-1 max-h-36 overflow-y-auto border border-aam-border rounded-md p-2">
                    {tpList.map(tp => (
                      <label key={tp.id} className="flex items-start gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={selectedTpIds.includes(tp.id)}
                          onChange={() => toggleTp(tp.id)} className="mt-0.5" />
                        <span>TP {tp.urutan}: {tp.deskripsi}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Tanggal *</label>
                <input type="date" className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  value={tanggal} onChange={e => setTanggal(e.target.value)} id="input-tanggal-penilaian" />
              </div>
              {!editId && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-md p-2">
                  💡 Setelah menyimpan, kamu akan diarahkan ke halaman input nilai.
                </p>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setSheetOpen(false)}>Batal</Button>
                <Button onClick={handleSave} disabled={saving} id="btn-simpan-penilaian">
                  {saving ? 'Menyimpan...' : editId ? 'Perbarui' : 'Simpan & Input Nilai'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
