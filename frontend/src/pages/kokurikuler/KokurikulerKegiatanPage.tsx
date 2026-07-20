import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { FormDrawer } from '../../components/FormDrawer';
import { SubPageLinks } from '../../components/SubPageLinks';
import { BackLink } from '../../components/BackLink';
import { PageMenu } from '../../components/PageMenu';
import { DIMENSI_LIST } from './kokurikulerConstants';

interface Kegiatan {
  id: number;
  tema: string;
  semester: number;
  tahunAjaranId: number;
  targetDimensi: string[];
  jumlahTim: number;
}

const KOKU_LINKS = [
  { key: 'tim', label: 'Tim & Penilai', path: '/kurikulum/kokurikuler', icon: 'groups' },
  { key: 'asesmen', label: 'Asesmen', path: '/kurikulum/kokurikuler', icon: 'grading' },
  { key: 'rapor', label: 'Rapor', path: '/kurikulum/kokurikuler', icon: 'menu_book' },
];

export function KokurikulerKegiatanPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [tema, setTema] = useState('');
  const [semester, setSemester] = useState<1 | 2>(1);
  const [selectedDimensi, setSelectedDimensi] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getKokurikulerKegiatan?.();
      setRows(res?.data ?? res ?? []);
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat kegiatan kokurikuler.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditId(null); setTema(''); setSemester(1); setSelectedDimensi([]);
    setSheetOpen(true);
  };

  const openEdit = (k: Kegiatan) => {
    setEditId(k.id); setTema(k.tema); setSemester(k.semester as 1 | 2);
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
      <BackLink to="/kurikulum/mapel" />
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3 mt-2">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Kegiatan Kokurikuler</h2>
          <p className="text-sm text-aam-text-muted mt-0.5">Tema, semester, dimensi, dan tim penilai per kelas.</p>
        </div>
        <PageMenu
          menuTitle="Menu Kokurikuler"
          actions={[{ key: 'tambah', label: 'Tambah Kegiatan', icon: 'add', variant: 'primary', id: 'btn-tambah-kegiatan', onClick: openAdd }]}
          links={[
            { key: 'tim', label: 'Tim & Asesmen', path: '/kurikulum/kokurikuler/tim', icon: 'groups' },
            { key: 'rapor', label: 'Rapor Kokurikuler', path: '/kurikulum/kokurikuler/rapor', icon: 'menu_book' },
          ]}
        />
      </div>

      <SubPageLinks links={KOKU_LINKS} />

      {loading ? <TableSkeleton rows={3} /> : rows.length === 0 ? (
        <EmptyState icon="school" message="Belum ada kegiatan kokurikuler. Tambahkan untuk semester ini." />
      ) : (
        <div className="space-y-3 mt-2">
          {rows.map(k => (
            <div key={k.id} id={`kegiatan-item-${k.id}`}>
            <Card icon="school">
              <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
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

      {/* FormDrawer — desktop modal / mobile bottom sheet */}
      <FormDrawer
        open={sheetOpen}
        title={editId ? 'Edit Kegiatan' : 'Tambah Kegiatan Kokurikuler'}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSave}
        submitting={saving}
        submitId="btn-simpan-kegiatan"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Tema *</label>
            <input className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
              value={tema} onChange={e => setTema(e.target.value)}
              placeholder="Contoh: Projek P5 Tema Kewirausahaan" id="input-tema-kegiatan" />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Semester *</label>
            <select className="w-full rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
              value={semester} onChange={e => setSemester(Number(e.target.value) as 1 | 2)}
              id="select-semester-kegiatan">
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Dimensi Target * (pilih ≥ 1)</label>
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
        </div>
      </FormDrawer>
    </PageContainer>
  );
}
