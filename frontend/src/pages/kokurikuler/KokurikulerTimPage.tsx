import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

interface TimEntry {
  kelasId: number;
  kelasNama: string;
  penilai: { guruId: number; guruNama: string }[];
}

interface GuruOption { id: number; nama: string; }
interface KelasOption { id: number; nama: string; }

export function KokurikulerTimPage() {
  const { kegiatanId } = useParams<{ kegiatanId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [tim, setTim] = useState<TimEntry[]>([]);
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [guruList, setGuruList] = useState<GuruOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedKelasId, setSelectedKelasId] = useState<number | ''>('');
  const [selectedGuruIds, setSelectedGuruIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [timRes, kelasRes, guruRes] = await Promise.all([
        (api as any).getKokurikulerTim?.(Number(kegiatanId)),
        api.adminGetKelas({ limit: 100 }),
        (api as any).getGuruList?.({ limit: 50 }).catch(() => ({ data: [] })),
      ]);
      setTim(timRes?.data ?? timRes ?? []);
      setKelasList(kelasRes?.data ?? []);
      setGuruList(guruRes?.data ?? []);
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data tim.');
    } finally {
      setLoading(false);
    }
  }, [kegiatanId]);

  useEffect(() => { load(); }, [load]);

  const toggleGuru = (id: number) => {
    setSelectedGuruIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAssign = async () => {
    if (!selectedKelasId) { toast.show('error', 'Pilih kelas terlebih dahulu.'); return; }
    if (selectedGuruIds.length === 0) { toast.show('error', 'Pilih minimal satu guru penilai.'); return; }
    setSaving(true);
    try {
      await (api as any).assignKokurikulerTim?.(Number(kegiatanId), {
        kelasId: Number(selectedKelasId),
        guruIds: selectedGuruIds,
      });
      toast.show('success', 'Tim penilai ditetapkan.');
      setSheetOpen(false);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menetapkan tim.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveGuru = async (kelasId: number, guruId: number) => {
    if (!window.confirm('Hapus guru ini dari tim?')) return;
    try {
      await (api as any).removeKokurikulerTim?.(Number(kegiatanId), kelasId, guruId);
      toast.show('success', 'Guru dihapus dari tim.');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menghapus.');
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button variant="secondary" onClick={() => navigate('/kurikulum/kokurikuler')} id="btn-back-kegiatan">
          ← Kegiatan
        </Button>
        <div>
          <h2 className="text-xl font-bold text-aam-text">Tim Penilai Kokurikuler</h2>
          <p className="text-sm text-aam-text-muted">Assign guru penilai per kelas untuk kegiatan ini.</p>
        </div>
        <Button onClick={() => { setSelectedKelasId(''); setSelectedGuruIds([]); setSheetOpen(true); }}
          className="ml-auto" id="btn-assign-tim">+ Assign Tim</Button>
      </div>

      {loading ? <TableSkeleton rows={3} /> : tim.length === 0 ? (
        <EmptyState icon="groups" message="Belum ada tim penilai. Klik 'Assign Tim' untuk menambah." />
      ) : (
        <div className="space-y-3">
          {tim.map(t => (
            <Card key={t.kelasId}>
              <h4 className="font-bold text-aam-text mb-2">{t.kelasNama}</h4>
              <div className="flex gap-2 flex-wrap">
                {t.penilai.map(p => (
                  <div key={p.guruId} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-sm">
                    <span>{p.guruNama}</span>
                    <button onClick={() => handleRemoveGuru(t.kelasId, p.guruId)}
                      className="text-red-500 ml-1 hover:text-red-700" id={`btn-remove-guru-${t.kelasId}-${p.guruId}`}>×</button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-4">Assign Tim Penilai</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-aam-text-muted mb-1">Kelas *</label>
                <select className="w-full rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
                  value={selectedKelasId} onChange={e => setSelectedKelasId(Number(e.target.value))}
                  id="select-kelas-tim">
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-text-muted mb-1">Guru Penilai * (boleh lebih dari 1)</label>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-aam-border rounded-md p-2">
                  {guruList.length === 0
                    ? <p className="text-sm text-aam-text-muted">Memuat daftar guru...</p>
                    : guruList.map((g: GuruOption) => (
                      <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={selectedGuruIds.includes(g.id)}
                          onChange={() => toggleGuru(g.id)} />
                        <span>{g.nama}</span>
                      </label>
                    ))
                  }
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setSheetOpen(false)}>Batal</Button>
                <Button onClick={handleAssign} disabled={saving} id="btn-simpan-tim">
                  {saving ? 'Menyimpan...' : 'Simpan Tim'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
