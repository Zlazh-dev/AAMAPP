import React, { useState, useCallback, useEffect } from 'react';
import { api, PelanggaranEntry, KategoriPelanggaran } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

const KATEGORI_VARIANT: Record<string, 'gray' | 'yellow' | 'red' | 'blue'> = {
  R: 'blue', S: 'yellow', B: 'red', SB: 'red', KHUSUS: 'gray',
};

export function VerifikasiPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PelanggaranEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [tolakOpen, setTolakOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [alasan, setAlasan] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getVerifikasiAntrean({ limit: 50 });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.show('error', 'Gagal memuat antrean verifikasi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSetujui = async (id: number) => {
    setProcessing(true);
    try {
      await api.setujuiPelanggaran(id);
      toast.show('success', 'Pelanggaran disetujui — saldo siswa dipotong.');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyetujui.');
    } finally {
      setProcessing(false);
    }
  };

  const openTolak = (id: number) => {
    setSelectedId(id); setAlasan(''); setTolakOpen(true);
  };

  const handleTolak = async () => {
    if (!alasan.trim()) { toast.show('error', 'Alasan penolakan wajib diisi.'); return; }
    if (!selectedId) return;
    setProcessing(true);
    try {
      await api.tolakPelanggaran(selectedId, alasan.trim());
      toast.show('success', 'Pelanggaran ditolak.');
      setTolakOpen(false);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menolak.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">
            Verifikasi Pelanggaran
            {total > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold w-5 h-5">
                {total > 99 ? '99+' : total}
              </span>
            )}
          </h2>
          <p className="text-sm text-aam-muted mt-0.5">Antrean laporan guru &amp; otomatis menunggu persetujuan.</p>
        </div>
        <Button variant="secondary" onClick={load} id="btn-refresh-verifikasi">↻ Refresh</Button>
      </div>

      <Card>
        {loading ? <TableSkeleton rows={3} /> : rows.length === 0 ? (
          <EmptyState icon="task_alt" message="Tidak ada pelanggaran yang menunggu verifikasi." />
        ) : (
          <div className="space-y-3 p-1">
            {rows.map(row => (
              <div key={row.id} className="rounded-lg border border-aam-border p-4 hover:bg-gray-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-aam-text">{row.siswaNama}</span>
                      <Badge variant={KATEGORI_VARIANT[row.kategori]}>{row.kategori}</Badge>
                      <Badge variant="yellow">MENUNGGU</Badge>
                    </div>
                    <p className="text-sm text-aam-muted mt-1">
                      {row.katalogBentuk ?? '(pelanggaran khusus)'} — <strong>{row.poin} poin</strong>
                    </p>
                    <p className="text-xs text-aam-muted mt-0.5">
                      {row.tanggal} · {row.sumber}
                      {row.pelaporNama ? ` · Pelapor: ${row.pelaporNama}` : ''}
                    </p>
                    {row.catatan && <p className="text-xs text-aam-muted mt-0.5 italic">"{row.catatan}"</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button onClick={() => handleSetujui(row.id)} disabled={processing} id={`btn-setujui-${row.id}`}>
                      ✓ Setujui
                    </Button>
                    <Button variant="danger" onClick={() => openTolak(row.id)} disabled={processing} id={`btn-tolak-${row.id}`}>
                      ✕ Tolak
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Inline sheet tolak */}
      {tolakOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setTolakOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-aam-text text-lg mb-2">Tolak Pelanggaran</h3>
            <p className="text-sm text-aam-muted mb-3">Berikan alasan penolakan (wajib).</p>
            <textarea className="w-full rounded-md border border-aam-border px-3 py-2 text-sm" rows={4}
              value={alasan} onChange={e => setAlasan(e.target.value)} placeholder="Alasan penolakan..."
              id="input-alasan-tolak" />
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="secondary" onClick={() => setTolakOpen(false)}>Batal</Button>
              <Button variant="danger" onClick={handleTolak} disabled={processing} id="btn-konfirmasi-tolak">
                {processing ? 'Memproses...' : 'Tolak Pelanggaran'}
              </Button>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

