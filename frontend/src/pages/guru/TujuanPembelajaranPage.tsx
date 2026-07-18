import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

interface TpEntry {
  id: number;
  deskripsi: string;
  urutan: number;
  aktif: boolean;
}

export function TujuanPembelajaranPage() {
  const { penugasanId } = useParams<{ penugasanId: string }>();
  const toast = useToast();
  const [rows, setRows] = useState<TpEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deskripsi, setDeskripsi] = useState('');
  const [urutan, setUrutan] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getTpList?.(Number(penugasanId));
      setRows(res?.data ?? res ?? []);
    } catch {
      toast.show('error', 'Gagal memuat tujuan pembelajaran.');
    } finally {
      setLoading(false);
    }
  }, [penugasanId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditId(null);
    setDeskripsi('');
    setUrutan('');
    setSheetOpen(true);
  };

  const openEdit = (tp: TpEntry) => {
    setEditId(tp.id);
    setDeskripsi(tp.deskripsi);
    setUrutan(tp.urutan);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!deskripsi.trim()) { toast.show('error', 'Deskripsi TP wajib diisi.'); return; }
    setSaving(true);
    try {
      const body = { deskripsi: deskripsi.trim(), urutan: urutan === '' ? undefined : Number(urutan) };
      if (editId) {
        await (api as any).updateTp?.(editId, body);
        toast.show('success', 'TP diperbarui.');
      } else {
        await (api as any).createTp?.(Number(penugasanId), body);
        toast.show('success', 'TP ditambahkan.');
      }
      setSheetOpen(false);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan TP.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus (nonaktifkan) TP ini?')) return;
    try {
      await (api as any).deleteTp?.(id);
      toast.show('success', 'TP dinonaktifkan.');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menghapus TP.');
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-aam-text">Tujuan Pembelajaran (TP)</h3>
        <Button onClick={openAdd} id="btn-tambah-tp">+ Tambah TP</Button>
      </div>

      {loading ? <TableSkeleton rows={3} /> : rows.filter(r => r.aktif).length === 0 ? (
        <EmptyState icon="list_alt" message="Belum ada TP. Tambahkan tujuan pembelajaran untuk mapel ini." />
      ) : (
        <div className="space-y-2">
          {rows.filter(r => r.aktif).map(tp => (
            <div key={tp.id} id={`tp-item-${tp.id}`}><Card className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="gray">TP {tp.urutan}</Badge>
                  <span className="text-sm text-aam-text">{tp.deskripsi}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" onClick={() => openEdit(tp)} id={`btn-edit-tp-${tp.id}`}>Edit</Button>
                <Button variant="secondary" onClick={() => handleDelete(tp.id)} id={`btn-delete-tp-${tp.id}`}>Hapus</Button>
              </div>
            </Card></div>
          ))}
        </div>
      )}

      {/* Inline sheet */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-aam-text text-lg mb-4">{editId ? 'Edit TP' : 'Tambah TP'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Urutan</label>
                <input type="number" className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  value={urutan} onChange={e => setUrutan(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Opsional (1, 2, 3...)" id="input-urutan-tp" min={1} />
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Deskripsi TP *</label>
                <textarea className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  rows={3} value={deskripsi} onChange={e => setDeskripsi(e.target.value)}
                  placeholder="Contoh: Siswa mampu menjelaskan konsep gerak..." id="input-deskripsi-tp" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setSheetOpen(false)}>Batal</Button>
                <Button onClick={handleSave} disabled={saving} id="btn-simpan-tp">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
