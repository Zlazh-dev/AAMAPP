import React, { useState, useCallback, useEffect } from 'react';
import { api, PelanggaranEntry , ApiError } from '../../api/client';
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
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat antrean verifikasi.');
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
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text flex items-center gap-2">
            Verifikasi Pelanggaran
            {total > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold w-5 h-5">
                {total > 99 ? '99+' : total}
              </span>
            )}
          </h2>
          <p className="text-sm text-aam-text-muted mt-0.5">Antrean laporan guru &amp; otomatis menunggu persetujuan.</p>
        </div>
        <PageMenu
          menuTitle="Menu Verifikasi"
          actions={[{ key: 'refresh', label: 'Refresh', icon: 'refresh', variant: 'default', id: 'btn-refresh-verifikasi', onClick: load }]}
        />
      </div>

      <BackLink to="/kesiswaan/pelanggaran" />

      <Card icon="task_alt">
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
                    <p className="text-sm text-aam-text-muted mt-1">
                      {row.katalogBentuk ?? '(pelanggaran khusus)'} — <strong>{row.poin} poin</strong>
                    </p>
                    <p className="text-xs text-aam-text-muted mt-0.5">
                      {row.tanggal} · {row.sumber}
                      {row.pelaporNama ? ` · Pelapor: ${row.pelaporNama}` : ''}
                    </p>
                    {row.catatan && <p className="text-xs text-aam-text-muted mt-0.5 italic">"{row.catatan}"</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button onClick={() => handleSetujui(row.id)} disabled={processing} id={`btn-setujui-${row.id}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check</span> Setujui
                    </Button>
                    <Button variant="danger" onClick={() => openTolak(row.id)} disabled={processing} id={`btn-tolak-${row.id}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span> Tolak
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tolak FormDrawer — desktop modal / mobile bottom sheet */}
      <FormDrawer
        open={tolakOpen}
        title="Tolak Pelanggaran"
        onClose={() => setTolakOpen(false)}
        onSubmit={handleTolak}
        submitting={processing}
        submitLabel="Tolak Pelanggaran"
      >
        <p className="text-sm text-aam-text-muted mb-3">Berikan alasan penolakan (wajib).</p>
        <textarea
          className="w-full rounded-md border border-aam-border px-3 py-2 text-sm" rows={4}
          value={alasan} onChange={e => setAlasan(e.target.value)}
          placeholder="Alasan penolakan..."
          id="input-alasan-tolak"
        />
      </FormDrawer>
    </PageContainer>
  );
}
