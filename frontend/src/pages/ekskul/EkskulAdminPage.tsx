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

interface EkskulEntry {
  id: number;
  nama: string;
  pembinaGuruId: number | null;
  pembinaNama: string | null;
}

interface GuruOption { id: number; nama: string; }

export function EkskulAdminPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<EkskulEntry[]>([]);
  const [guruList, setGuruList] = useState<GuruOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nama, setNama] = useState('');
  const [pembinaGuruId, setPembinaGuruId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, gRes] = await Promise.all([
        (api as any).getEkskul?.(),
        (api as any).getGuruList?.({ limit: 200 }).catch(() => ({ data: [] })),
      ]);
      setRows(eRes?.data ?? eRes ?? []);
      setGuruList(gRes?.data ?? []);
    } catch {
      toast.show('error', 'Gagal memuat daftar ekskul.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditId(null); setNama(''); setPembinaGuruId(''); setSheetOpen(true); };
  const openEdit = (e: EkskulEntry) => { setEditId(e.id); setNama(e.nama); setPembinaGuruId(e.pembinaGuruId ?? ''); setSheetOpen(true); };

  const handleSave = async () => {
    if (!nama.trim()) { toast.show('error', 'Nama ekskul wajib diisi.'); return; }
    setSaving(true);
    try {
      const body = { nama: nama.trim(), pembinaGuruId: pembinaGuruId !== '' ? Number(pembinaGuruId) : null };
      if (editId) {
        await (api as any).updateEkskul?.(editId, body);
        toast.show('success', 'Ekskul diperbarui.');
      } else {
        await (api as any).createEkskul?.(body);
        toast.show('success', 'Ekskul ditambahkan.');
      }
      setSheetOpen(false);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan ekskul.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus ekskul ini?')) return;
    try {
      await (api as any).deleteEkskul?.(id);
      toast.show('success', 'Ekskul dihapus.');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menghapus ekskul.');
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Kelola Ekstrakurikuler</h2>
          <p className="text-sm text-aam-muted mt-0.5">Nama ekskul dan pembina guru.</p>
        </div>
        <Button onClick={openAdd} id="btn-tambah-ekskul">+ Tambah Ekskul</Button>
      </div>

      {loading ? <TableSkeleton rows={4} /> : rows.length === 0 ? (
        <EmptyState icon="sports" message="Belum ada ekstrakurikuler. Tambahkan untuk sekolah ini." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Nama Ekskul', 'Pembina', 'Aksi'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-aam-border">
                {rows.map((e, idx) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-aam-muted">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium">{e.nama}</td>
                    <td className="px-3 py-2 text-aam-muted">{e.pembinaNama ?? <span className="italic">Belum ada</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => navigate(`/admin/ekskul/${e.id}`)}
                          id={`btn-kelola-ekskul-${e.id}`}>Kelola</Button>
                        <Button variant="secondary" onClick={() => openEdit(e)}
                          id={`btn-edit-ekskul-${e.id}`}>Edit</Button>
                        <Button variant="secondary" onClick={() => handleDelete(e.id)}
                          id={`btn-delete-ekskul-${e.id}`}>Hapus</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-4">{editId ? 'Edit Ekskul' : 'Tambah Ekskul'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Nama Ekskul *</label>
                <input className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  value={nama} onChange={e => setNama(e.target.value)}
                  placeholder="Contoh: Pramuka, OSIS, Basket..." id="input-nama-ekskul" />
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Pembina Guru</label>
                <select className="w-full rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
                  value={pembinaGuruId} onChange={e => setPembinaGuruId(e.target.value !== '' ? Number(e.target.value) : '')}
                  id="select-pembina-ekskul">
                  <option value="">-- Pilih Pembina --</option>
                  {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setSheetOpen(false)}>Batal</Button>
                <Button onClick={handleSave} disabled={saving} id="btn-simpan-ekskul">
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
