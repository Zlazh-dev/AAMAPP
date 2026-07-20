import React, { useState, useCallback, useEffect } from 'react';
import { api, KatalogEntry, KategoriPelanggaran , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { Table, ColumnDef } from '../../components/Table';
import { FormDrawer } from '../../components/FormDrawer';
import { SubPageLayout } from '../../components/SubPageLinks';
import { BackLink } from '../../components/BackLink';
import { Pagination } from '../../components/Pagination';
import { PageMenu } from '../../components/PageMenu';

const KATEGORI_LABEL: Record<KategoriPelanggaran, string> = {
  R: 'Ringan (10 poin)', S: 'Sedang (25 poin)', B: 'Berat (50 poin)',
  SB: 'Sangat Berat (100 poin)', KHUSUS: 'Khusus',
};
const KATEGORI_POIN: Record<string, number> = { R: 10, S: 25, B: 50, SB: 100, KHUSUS: 0 };
const KATEGORI_VARIANT: Record<string, 'gray' | 'yellow' | 'red' | 'blue'> = {
  R: 'blue', S: 'yellow', B: 'red', SB: 'red', KHUSUS: 'gray',
};

/** Sub dari Tata Tertib (IA-HIERARCHY-V2). */
const TATA_TERTIB_SUB_LINKS = [
  { key: 'pelanggaran', label: 'Pelanggaran', path: '/kesiswaan/pelanggaran', icon: 'warning', description: 'Catat dan pantau pelanggaran siswa' },
];

export function TataTertibPage() {
  const toast = useToast();
  const [rows, setRows] = useState<KatalogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25 });
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<KatalogEntry | null>(null);
  const [bentuk, setBentuk] = useState('');
  const [kategori, setKategori] = useState<KategoriPelanggaran>('R');
  const [poin, setPoin] = useState('10');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getKatalog({ q, kategori: kategoriFilter, page, limit: 25 });
      setRows(res.data);
      setTotal(res.total);
      setMeta({ total: res.total, page: res.page, limit: res.limit });
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat katalog tata tertib.');
    } finally {
      setLoading(false);
    }
  }, [q, kategoriFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q, kategoriFilter]);

  const openNew = () => {
    setEditing(null);
    setBentuk(''); setKategori('R'); setPoin('10');
    setDrawerOpen(true);
  };

  const openEdit = (row: KatalogEntry) => {
    setEditing(row);
    setBentuk(row.bentuk); setKategori(row.kategori); setPoin(String(row.poin));
    setDrawerOpen(true);
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
      setDrawerOpen(false);
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

  const columns: ColumnDef<KatalogEntry>[] = [
    { header: 'No.', width: 'w-12', cell: (r) => <span className="text-aam-text-muted">{r.nomor}</span> },
    { header: 'Bentuk Pelanggaran', cell: (r) => r.bentuk },
    { header: 'Kat.', width: 'w-16', cell: (r) => <Badge variant={KATEGORI_VARIANT[r.kategori]}>{r.kategori}</Badge> },
    { header: 'Poin', width: 'w-16', align: 'right', cell: (r) => <span className="font-medium">{r.poin}</span> },
    { header: 'Status', width: 'w-24', cell: (r) => <Badge variant={r.aktif ? 'gray' : 'red'}>{r.aktif ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      header: '',
      width: 'w-28',
      align: 'right',
      cell: (r) => (
        <span className="flex gap-2 justify-end">
          <button className="text-blue-600 hover:underline text-xs" onClick={() => openEdit(r)} id={`btn-edit-katalog-${r.id}`}>Edit</button>
          {r.aktif && <button className="text-red-500 hover:underline text-xs" onClick={() => handleDelete(r)}>Nonaktif</button>}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <BackLink to="/kesiswaan/laporan" />
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3 mt-2">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Tata Tertib</h2>
          <p className="text-sm text-aam-text-muted mt-0.5">Katalog butir pelanggaran &amp; poin demerit.</p>
        </div>
        <PageMenu
          menuTitle="Menu Tata Tertib"
          actions={[{ key: 'tambah', label: 'Tambah Butir', icon: 'add', variant: 'primary', id: 'btn-tambah-katalog', onClick: openNew }]}
        />
      </div>

      <SubPageLayout links={TATA_TERTIB_SUB_LINKS}>

      {/* Filter */}
      <Card>
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

      {/* Tabel */}
      <Card icon="gavel">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <>
            <Table
              columns={columns}
              data={rows}
              rowKey={(r) => r.id}
              emptyMessage="Belum ada butir tata tertib."
            />
            {rows.length > 0 && (
              <p className="text-xs text-aam-text-muted mt-2 px-1">Total: {total}</p>
            )}
            <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={setPage} loading={loading} />
          </>
        )}
      </Card>

      {/* FormDrawer — adaptif desktop modal / mobile bottom sheet */}
      <FormDrawer
        open={drawerOpen}
        title={editing ? 'Edit Butir Tata Tertib' : 'Tambah Butir Tata Tertib'}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
        submitting={saving}
        submitLabel={editing ? 'Perbarui' : 'Simpan'}
        submitId="btn-simpan-katalog"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Bentuk Pelanggaran *</label>
            <textarea className="w-full rounded-md border border-aam-border px-3 py-2 text-sm" rows={3}
              value={bentuk} onChange={e => setBentuk(e.target.value)} id="input-bentuk-pelanggaran"
              placeholder="Deskripsi bentuk pelanggaran..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Kategori *</label>
            <select className="w-full rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
              value={kategori} onChange={e => handleKategoriChange(e.target.value as KategoriPelanggaran)} id="select-kategori-form">
              {(['R','S','B','SB','KHUSUS'] as KategoriPelanggaran[]).map(k => (
                <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Poin *</label>
            <input type="number" className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
              value={poin} onChange={e => setPoin(e.target.value)} min={0} id="input-poin" />
          </div>
        </div>
      </FormDrawer>
      </SubPageLayout>
    </PageContainer>
  );
}
