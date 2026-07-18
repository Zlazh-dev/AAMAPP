import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { DIMENSI_LIST } from './kokurikulerConstants';

interface Kegiatan {
  id: number;
  tema: string;
  semester: number;
  tahunAjaranId: number;
  targetDimensi: string[];
  jumlahTim: number;
}

interface TahunAjaran { id: number; nama: string; }

export function KokurikulerKegiatanPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [taList, setTaList] = useState<TahunAjaran[]>([]);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [tema, setTema] = useState('');
  const [semester, setSemester] = useState<1 | 2>(1);
  const [selectedDimensi, setSelectedDimensi] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, taRes] = await Promise.all([
        (api as any).getKokurikulerKegiatan?.(),
        (api as any).getTahunAjaranList?.().catch(() => ({ data: [] })),
      ]);
      setRows(res?.data ?? res ?? []);
      setTaList(taRes?.data ?? taRes ?? []);
    } catch {
      toast.show('error', 'Gagal memuat kegiatan kokurikuler.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditId(null);
    setTema('');
    setSemester(1);
    setSelectedDimensi([]);
    setSheetOpen(true);
  };

  const openEdit = (k: Kegiatan) => {
    setEditId(k.id);
    setTema(k.tema);
    setSemester(k.semester as 1 | 2);
    setSelectedDimensi([...k.targetDimensi]);
    setSheetOpen(true);
  };

  const toggleDimensi = (d: string) => {
    setSelectedDimensi(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSave = async () => {
    if (!tema.trim()) { toast.show('error', 'Tema kegiatan wajib diisi.'); return; }
    if (selectedDimensi.length === 0) { toast.show('error', 'Pilih minimal satu dimensi.'); return; }
    setSaving(true);
    try {
      const body = { tema: tema.trim(), semester, targetDimensi: selectedDimensi };
      if (editId) {
        await (api as any).updateKokurikulerKegiatan?.(editId, body);
        toast.show('success', 'Kegiatan diperbarui.');
      } else {
        await (api as any).createKokurikulerKegiatan?.(body);
        toast.show('success', 'Kegiatan ditambahkan.');
      }
      setSheetOpen(false);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan kegiatan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus kegiatan ini?')) return;
    try {
      await (api as any).deleteKokurikulerKegiatan?.(id);
      toast.show('success', 'Kegiatan dihapus.');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menghapus.');
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Kelola Kegiatan Kokurikuler</h2>
          <p className="text-sm text-aam-muted mt-0.5">Tema, semester, dimensi, dan tim penilai per kelas.</p>
        </div>
        <Button onClick={openAdd} id="btn-tambah-kegiatan">+ Tambah Kegiatan</Button>
      </div>

      {loading ? <TableSkeleton rows={3} /> : rows.length === 0 ? (
        <EmptyState icon="school" message="Belum ada kegiatan kokurikuler. Tambahkan untuk semester ini." />
      ) : (
        <div className="space-y-3">
          {rows.map(k => (
            <div key={k.id} id={`kegiatan-item-${k.id}`}>
              <Card>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-aam-text">{k.tema}</span>
                      <Badge variant="blue">Semester {k.semester}</Badge>
                      <Badge variant="gray">{k.jumlahTim ?? 0} tim</Badge>
                    </div>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {k.targetDimensi.map(d => (
                        <span key={d} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">{d}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button onClick={() => navigate(`/kurikulum/kokurikuler/${k.id}/tim`)}
                      id={`btn-tim-${k.id}`} variant="secondary">Tim</Button>
                    <Button onClick={() => openEdit(k)} variant="secondary" id={`btn-edit-kegiatan-${k.id}`}>Edit</Button>
                    <Button onClick={() => handleDelete(k.id)} variant="secondary" id={`btn-delete-kegiatan-${k.id}`}>Hapus</Button>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Inline sheet */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-aam-text text-lg mb-4">{editId ? 'Edit Kegiatan' : 'Tambah Kegiatan'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Tema *</label>
                <input className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  value={tema} onChange={e => setTema(e.target.value)}
                  placeholder="Contoh: Projek P5 Tema Kewirausahaan" id="input-tema-kegiatan" />
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Semester *</label>
                <select className="w-full rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
                  value={semester} onChange={e => setSemester(Number(e.target.value) as 1 | 2)}
                  id="select-semester-kegiatan">
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Dimensi Target * (pilih ≥ 1)</label>
                <div className="grid grid-cols-2 gap-1.5 border border-aam-border rounded-md p-2">
                  {DIMENSI_LIST.map(d => (
                    <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selectedDimensi.includes(d)}
                        onChange={() => toggleDimensi(d)} />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setSheetOpen(false)}>Batal</Button>
                <Button onClick={handleSave} disabled={saving} id="btn-simpan-kegiatan">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
