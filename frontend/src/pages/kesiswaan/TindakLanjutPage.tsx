import React, { useState, useCallback, useEffect } from 'react';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { FormDrawer } from '../../components/FormDrawer';
import { BackLink } from '../../components/BackLink';
import { PageMenu } from '../../components/PageMenu';

type TahapTindakLanjut = 'PERINGATAN_1' | 'PERINGATAN_2' | 'PERINGATAN_3' | 'TINDAKAN_KHUSUS';
type StatusTindakLanjut = 'BARU' | 'SELESAI';

interface TindakLanjutEntry {
  id: number;
  siswaId: number;
  siswaNama: string;
  siswaKelas?: string;
  tahap: TahapTindakLanjut;
  ambang: number;
  status: StatusTindakLanjut;
  catatanPelaksanaan: string | null;
  dilaksanakanOlehNama: string | null;
  dilaksanakanPada: string | null;
  createdAt: string;
}

const TAHAP_LABEL: Record<TahapTindakLanjut, string> = {
  PERINGATAN_1: 'Peringatan I (200 poin)',
  PERINGATAN_2: 'Peringatan II (300 poin)',
  PERINGATAN_3: 'Peringatan III (400 poin)',
  TINDAKAN_KHUSUS: 'Tindakan Khusus (≥500 / KHUSUS)',
};
const TAHAP_VARIANT: Record<TahapTindakLanjut, 'yellow' | 'blue' | 'purple' | 'red'> = {
  PERINGATAN_1: 'yellow',
  PERINGATAN_2: 'blue',
  PERINGATAN_3: 'purple',
  TINDAKAN_KHUSUS: 'red',
};

/** Sub dari Pelanggaran (IA-HIERARCHY-V2). */

export function TindakLanjutPage() {
  const toast = useToast();
  const [rows, setRows] = useState<TindakLanjutEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusTindakLanjut | ''>('BARU');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState('');
  const [selectedTahap, setSelectedTahap] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getTindakLanjut?.(statusFilter || undefined);
      if (res) {
        setRows(res.data ?? res);
        setTotal(res.total ?? (res.data ?? res).length);
      }
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat tindak lanjut.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openSelesai = (row: TindakLanjutEntry) => {
    setSelectedId(row.id);
    setSelectedSiswa(row.siswaNama);
    setSelectedTahap(TAHAP_LABEL[row.tahap]);
    setCatatan('');
    setSheetOpen(true);
  };

  const handleSelesai = async () => {
    if (!catatan.trim()) { toast.show('error', 'Catatan pelaksanaan wajib diisi.'); return; }
    if (!selectedId) return;
    setSaving(true);
    try {
      await (api as any).selesaiTindakLanjut?.(selectedId, catatan.trim());
      toast.show('success', 'Tindak lanjut ditandai selesai.');
      setSheetOpen(false);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text flex items-center gap-2">
            Tindak Lanjut
            {statusFilter === 'BARU' && total > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold w-5 h-5">
                {total > 99 ? '99+' : total}
              </span>
            )}
          </h2>
          <p className="text-sm text-aam-text-muted mt-0.5">Antrean tindak lanjut otomatis berdasarkan ambang poin.</p>
        </div>
        <PageMenu
          menuTitle="Menu Tindak Lanjut"
          actions={[{ key: 'refresh', label: 'Refresh', icon: 'refresh', variant: 'default', id: 'btn-refresh-tindak-lanjut', onClick: load }]}
        />
      </div>

      <BackLink to="/kesiswaan/pelanggaran" />
      {/* Filter */}
      <Card>
        <select
          className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          id="select-status-tl"
        >
          <option value="">Semua Status</option>
          <option value="BARU">Belum Selesai</option>
          <option value="SELESAI">Selesai</option>
        </select>
      </Card>

      <Card icon="assignment_late">
        {loading ? <TableSkeleton rows={4} /> : rows.length === 0 ? (
          <EmptyState icon="task_alt" message="Tidak ada tindak lanjut yang menunggu." />
        ) : (
          <div className="space-y-3 p-1">
            {rows.map(row => (
              <div key={row.id} className="rounded-lg border border-aam-border p-4 hover:bg-gray-50"
                id={`tl-item-${row.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-aam-text">{row.siswaNama}</span>
                      {row.siswaKelas && <span className="text-xs text-aam-text-muted">({row.siswaKelas})</span>}
                      <Badge variant={TAHAP_VARIANT[row.tahap]}>{row.tahap.replace('_', ' ')}</Badge>
                      <Badge variant={row.status === 'BARU' ? 'yellow' : 'green'}>{row.status}</Badge>
                    </div>
                    <p className="text-sm text-aam-text-muted mt-1">{TAHAP_LABEL[row.tahap]}</p>
                    {row.status === 'SELESAI' && row.catatanPelaksanaan && (
                      <p className="text-xs text-aam-text-muted mt-1 italic flex items-start gap-1">
                        <span className="material-symbols-outlined text-green-600 mt-0.5" style={{ fontSize: '0.875rem' }}>check_circle</span>
                        {row.catatanPelaksanaan}
                        {row.dilaksanakanOlehNama ? ` — ${row.dilaksanakanOlehNama}` : ''}
                        {row.dilaksanakanPada ? ` (${row.dilaksanakanPada.slice(0, 10)})` : ''}
                      </p>
                    )}
                  </div>
                  {row.status === 'BARU' && (
                    <Button onClick={() => openSelesai(row)} id={`btn-selesai-${row.id}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check</span> Selesai
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Catat Selesai FormDrawer */}
      <FormDrawer
        open={sheetOpen}
        title="Catat Pelaksanaan Tindak Lanjut"
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSelesai}
        submitting={saving}
        submitLabel="Tandai Selesai"
      >
        <div className="space-y-3">
          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
            <p className="font-medium text-aam-text">{selectedSiswa}</p>
            <p className="text-aam-text-muted">{selectedTahap}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Catatan Pelaksanaan *</label>
            <textarea
              className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
              rows={4}
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Deskripsikan tindakan yang telah dilaksanakan..."
              id="input-catatan-pelaksanaan"
            />
          </div>
        </div>
      </FormDrawer>
    </PageContainer>
  );
}
