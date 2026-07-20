import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { Table, ColumnDef } from '../../components/Table';
import { FormDrawer } from '../../components/FormDrawer';
import { SubPageLinks } from '../../components/SubPageLinks';
import { BackLink } from '../../components/BackLink';
import { PageMenu } from '../../components/PageMenu';

interface EkskulEntry {
  id: number;
  nama: string;
  pembinaGuruId: number | null;
  pembinaNama: string | null;
}

interface GuruOption { id: number; nama: string; }

// Dead links /kurikulum/ekskul/pembina dan /kurikulum/ekskul/rapor dihapus (tidak ada rute)


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
        (api as any).getGuruList?.({ limit: 50 }).catch(() => ({ data: [] })),
      ]);
      setRows(eRes?.data ?? eRes ?? []);
      setGuruList(gRes?.data ?? []);
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat daftar ekskul.');
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

  const columns: ColumnDef<EkskulEntry>[] = [
    { header: '#', width: 'w-10', cell: (_, idx) => <span className="text-aam-text-muted">{idx + 1}</span> },
    { header: 'Nama Ekskul', cell: (e) => <span className="font-medium">{e.nama}</span> },
    { header: 'Pembina', cell: (e) => <span className="text-aam-text-muted">{e.pembinaNama ?? <span className="italic">Belum ada</span>}</span> },
    {
      header: 'Aksi',
      align: 'right',
      cell: (e) => (
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => navigate(`/kurikulum/ekskul/${e.id}`)} id={`btn-kelola-ekskul-${e.id}`}>Kelola</Button>
          <Button variant="secondary" onClick={() => openEdit(e)} id={`btn-edit-ekskul-${e.id}`}>Edit</Button>
          <Button variant="secondary" onClick={() => handleDelete(e.id)} id={`btn-delete-ekskul-${e.id}`}>Hapus</Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <BackLink to="/kurikulum/mapel" />
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3 mt-2">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Kelola Ekstrakurikuler</h2>
          <p className="text-sm text-aam-text-muted mt-0.5">Nama ekskul dan pembina guru.</p>
        </div>
        <PageMenu
          menuTitle="Menu Ekskul"
          actions={[{ key: 'tambah', label: 'Tambah Ekskul', icon: 'add', variant: 'primary', id: 'btn-tambah-ekskul', onClick: openAdd }]}
        />
      </div>

      {loading ? <TableSkeleton rows={4} /> : rows.length === 0 ? (
        <EmptyState icon="sports" message="Belum ada ekstrakurikuler. Tambahkan untuk sekolah ini." />
      ) : (
        <Card icon="sports">
          <div className="p-1">
            <Table columns={columns} data={rows} rowKey={(e) => e.id} />
          </div>
        </Card>
      )}

      {/* FormDrawer — desktop modal / mobile bottom sheet */}
      <FormDrawer
        open={sheetOpen}
        title={editId ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler'}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSave}
        submitting={saving}
        submitId="btn-simpan-ekskul"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Nama Ekskul *</label>
            <input className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
              value={nama} onChange={e => setNama(e.target.value)}
              placeholder="Contoh: Pramuka, OSIS, Basket..." id="input-nama-ekskul" />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Pembina Guru</label>
            <select className="w-full rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
              value={pembinaGuruId} onChange={e => setPembinaGuruId(e.target.value !== '' ? Number(e.target.value) : '')}
              id="select-pembina-ekskul">
              <option value="">-- Pilih Pembina --</option>
              {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
          </div>
        </div>
      </FormDrawer>
    </PageContainer>
  );
}
