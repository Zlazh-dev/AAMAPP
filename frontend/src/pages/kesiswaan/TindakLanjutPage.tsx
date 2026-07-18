import React, { useState, useCallback, useEffect } from 'react';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

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

export function TindakLanjutPage() {
  const toast = useToast();
  const [rows, setRows] = useState<TindakLanjutEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusTindakLanjut | ''>('BARU');

  // Sheet selesai
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState('');
  const [selectedTahap, setSelectedTahap] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter) q.set('status', statusFilter);
      q.set('limit', '50');
      const res = await (api as any).getTindakLanjut?.(statusFilter || undefined);
      if (res) {
        setRows(res.data ?? res);
        setTotal(res.total ?? (res.data ?? res).length);
      }
    } catch {
      toast.show('error', 'Gagal memuat tindak lanjut.');
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">
            Tindak Lanjut
            {statusFilter === 'BARU' && total > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold w-5 h-5">
                {total > 99 ? '99+' : total}
              </span>
            )}
          </h2>
          <p className="text-sm text-aam-muted mt-0.5">Antrean tindak lanjut otomatis berdasarkan ambang poin.</p>
        </div>
        <Button variant="secondary" onClick={load} id="btn-refresh-tindak-lanjut">↻ Refresh</Button>
      </div>

      {/* Filter */}
      <Card className="mb-4">
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

      <Card>
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
                      {row.siswaKelas && <span className="text-xs text-aam-muted">({row.siswaKelas})</span>}
                      <Badge variant={TAHAP_VARIANT[row.tahap]}>{row.tahap.replace('_', ' ')}</Badge>
                      <Badge variant={row.status === 'BARU' ? 'yellow' : 'green'}>{row.status}</Badge>
                    </div>
                    <p className="text-sm text-aam-muted mt-1">{TAHAP_LABEL[row.tahap]}</p>
                    {row.status === 'SELESAI' && row.catatanPelaksanaan && (
                      <p className="text-xs text-aam-muted mt-1 italic">
                        ✓ {row.catatanPelaksanaan}
                        {row.dilaksanakanOlehNama ? ` — ${row.dilaksanakanOlehNama}` : ''}
                        {row.dilaksanakanPada ? ` (${row.dilaksanakanPada.slice(0, 10)})` : ''}
                      </p>
                    )}
                  </div>
                  {row.status === 'BARU' && (
                    <Button onClick={() => openSelesai(row)} id={`btn-selesai-${row.id}`}>
                      ✓ Catat Selesai
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Inline sheet catat selesai */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-aam-text text-lg mb-1">Catat Pelaksanaan</h3>
            <p className="text-sm text-aam-muted mb-1">{selectedSiswa}</p>
            <p className="text-sm font-medium text-aam-text mb-4">{selectedTahap}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Catatan Pelaksanaan *</label>
                <textarea
                  className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  rows={4}
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  placeholder="Deskripsikan tindakan yang telah dilaksanakan..."
                  id="input-catatan-pelaksanaan"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setSheetOpen(false)}>Batal</Button>
                <Button onClick={handleSelesai} disabled={saving} id="btn-konfirmasi-selesai">
                  {saving ? 'Menyimpan...' : 'Tandai Selesai'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
