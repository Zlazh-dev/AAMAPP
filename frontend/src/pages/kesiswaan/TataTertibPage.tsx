import React, { useState, useCallback, useEffect } from 'react';
import { api, KatalogEntry, KategoriPelanggaran } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

const KATEGORI_LABEL: Record<KategoriPelanggaran, string> = {
  R: 'Ringan (10 poin)', S: 'Sedang (25 poin)', B: 'Berat (50 poin)',
  SB: 'Sangat Berat (100 poin)', KHUSUS: 'Khusus',
};
const KATEGORI_POIN: Record<string, number> = { R: 10, S: 25, B: 50, SB: 100, KHUSUS: 0 };
const KATEGORI_VARIANT: Record<string, 'gray' | 'yellow' | 'red' | 'blue'> = {
  R: 'blue', S: 'yellow', B: 'red', SB: 'red', KHUSUS: 'gray',
};

export function TataTertibPage() {
  const toast = useToast();
  const [rows, setRows] = useState<KatalogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<KatalogEntry | null>(null);
  const [bentuk, setBentuk] = useState('');
  const [kategori, setKategori] = useState<KategoriPelanggaran>('R');
  const [poin, setPoin] = useState('10');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getKatalog({ q, kategori: kategoriFilter, limit: 100 });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.show('error', 'Gagal memuat katalog tata tertib.');
    } finally {
      setLoading(false);
    }
  }, [q, kategoriFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setBentuk(''); setKategori('R'); setPoin('10');
    setSheetOpen(true);
  };

  const openEdit = (row: KatalogEntry) => {
    setEditing(row);
    setBentuk(row.bentuk); setKategori(row.kategori); setPoin(String(row.poin));
    setSheetOpen(true);
  };

  const handleKategoriChange = (kat: KategoriPelanggaran) => {
    setKategori(kat);
    setPoin(String(KATEGORI_POIN[kat] ?? 0));
  };

  const handleSave = async () => {
    if (!bentuk.trim()) { toast.show('error', 'Bentuk pelanggaran wajib diisi.'); return; }
    const poinNum = Number(poin);
    if (isNaN(poinNum) || poinNum < 0) { toast.show('error', 'Poin harus angka ≥ 0.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.updateKatalog(editing.id, { bentuk: bentuk.trim(), kategori, poin: poinNum });
      } else {
        await api.createKatalog({ bentuk: bentuk.trim(), kategori, poin: poinNum });
      }
      toast.show('success', editing ? 'Butir diperbarui.' : 'Butir ditambahkan.');
      setSheetOpen(false);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: KatalogEntry) => {
    if (!confirm(`Nonaktifkan butir "${row.bentuk}"?`)) return;
    try {
      await api.deleteKatalog(row.id);
      toast.show('success', 'Butir dinonaktifkan.');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal.');
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Tata Tertib</h2>
          <p className="text-sm text-aam-muted mt-0.5">Katalog butir pelanggaran &amp; poin demerit.</p>
        </div>
        <Button onClick={openNew} id="btn-tambah-katalog">+ Tambah Butir</Button>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Cari butir pelanggaran..."
            className="rounded-md border border-aam-border px-3 py-2 text-sm flex-1 min-w-[180px]"
            value={q} onChange={e => setQ(e.target.value)} id="input-cari-katalog" />
          <select className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
            value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)} id="select-kategori-filter">
            <option value="">Semua Kategori</option>
            {(['R','S','B','SB','KHUSUS'] as KategoriPelanggaran[]).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        {loading ? <TableSkeleton rows={5} /> : rows.length === 0 ? (
          <EmptyState icon="gavel" message="Belum ada butir tata tertib." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['No.','Bentuk Pelanggaran','Kat.','Poin','Status',''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-aam-border">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-aam-muted">{row.nomor}</td>
                    <td className="px-3 py-2">{row.bentuk}</td>
                    <td className="px-3 py-2"><Badge variant={KATEGORI_VARIANT[row.kategori]}>{row.kategori}</Badge></td>
                    <td className="px-3 py-2 text-right font-medium">{row.poin}</td>
                    <td className="px-3 py-2"><Badge variant={row.aktif ? 'gray' : 'red'}>{row.aktif ? 'Aktif' : 'Nonaktif'}</Badge></td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button className="text-blue-600 hover:underline text-xs mr-3" onClick={() => openEdit(row)} id={`btn-edit-katalog-${row.id}`}>Edit</button>
                      {row.aktif && <button className="text-red-500 hover:underline text-xs" onClick={() => handleDelete(row)}>Nonaktifkan</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-aam-muted mt-2 px-3 pb-2">Total: {total}</p>
          </div>
        )}
      </Card>

      {/* Inline sheet */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-aam-text text-lg mb-4">{editing ? 'Edit Butir' : 'Tambah Butir Tata Tertib'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Bentuk Pelanggaran *</label>
                <textarea className="w-full rounded-md border border-aam-border px-3 py-2 text-sm" rows={3}
                  value={bentuk} onChange={e => setBentuk(e.target.value)} id="input-bentuk-pelanggaran"
                  placeholder="Deskripsi bentuk pelanggaran..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Kategori *</label>
                <select className="w-full rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
                  value={kategori} onChange={e => handleKategoriChange(e.target.value as KategoriPelanggaran)} id="select-kategori-form">
                  {(['R','S','B','SB','KHUSUS'] as KategoriPelanggaran[]).map(k => (
                    <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Poin *</label>
                <input type="number" className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  value={poin} onChange={e => setPoin(e.target.value)} min={0} id="input-poin" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setSheetOpen(false)}>Batal</Button>
                <Button onClick={handleSave} disabled={saving} id="btn-simpan-katalog">
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

