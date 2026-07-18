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

interface SiswaRaporItem {
  siswaId: number;
  nama: string;
  nis: string | null;
  raporStatus: 'DRAFT' | 'FINAL' | null;
  nilaiRingkas?: number | null;
}

interface KelasOption {
  id: number;
  nama: string;
}

export function RaporListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<number | null>(null);
  const [rows, setRows] = useState<SiswaRaporItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingKelas, setLoadingKelas] = useState(true);

  // Load kelas wali (wali kelas = guru whose waliKelas.id === kelas)
  useEffect(() => {
    setLoadingKelas(true);
    (api as any).getRaporKelasOptions?.()
      .then((res: any) => {
        const list = res?.data ?? res ?? [];
        setKelasList(list);
        if (list.length > 0) setSelectedKelasId(list[0].id);
      })
      .catch(() => {
        // Fallback: try adminGetKelas
        api.adminGetKelas({ limit: 50 })
          .then((r: any) => {
            const list = r?.data ?? [];
            setKelasList(list);
            if (list.length > 0) setSelectedKelasId(list[0].id);
          })
          .catch(() => toast.show('error', 'Gagal memuat daftar kelas.'));
      })
      .finally(() => setLoadingKelas(false));
  }, []);

  const load = useCallback(async () => {
    if (!selectedKelasId) return;
    setLoading(true);
    try {
      const res = await (api as any).getRaporKelas?.(selectedKelasId);
      setRows(res?.data ?? res ?? []);
    } catch {
      toast.show('error', 'Gagal memuat daftar rapor.');
    } finally {
      setLoading(false);
    }
  }, [selectedKelasId]);

  useEffect(() => { load(); }, [load]);

  function statusVariant(s: 'DRAFT' | 'FINAL' | null): 'yellow' | 'green' | 'gray' {
    if (s === 'FINAL') return 'green';
    if (s === 'DRAFT') return 'yellow';
    return 'gray';
  }

  const finalCount = rows.filter(r => r.raporStatus === 'FINAL').length;

  return (
    <PageContainer>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-aam-text">Rapor Siswa</h2>
        <p className="text-sm text-aam-muted mt-0.5">Kelola dan finalisasi rapor siswa di kelas Anda.</p>
      </div>

      {/* Kelas selector */}
      {kelasList.length > 1 && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-aam-muted">Kelas:</label>
          <select
            className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
            value={selectedKelasId ?? ''}
            onChange={e => setSelectedKelasId(Number(e.target.value))}
            id="select-kelas-rapor"
          >
            {kelasList.map(k => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
      )}

      {loadingKelas ? <TableSkeleton rows={3} /> : kelasList.length === 0 ? (
        <EmptyState icon="class" message="Kamu belum menjadi wali kelas semester ini. Hubungi operator." />
      ) : loading ? <TableSkeleton rows={5} /> : rows.length === 0 ? (
        <EmptyState icon="people" message="Tidak ada siswa di kelas ini." />
      ) : (
        <Card>
          {/* Progress bar */}
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <Badge variant="green">{finalCount} FINAL</Badge>
            <Badge variant="yellow">{rows.filter(r => r.raporStatus === 'DRAFT').length} DRAFT</Badge>
            <Badge variant="gray">{rows.filter(r => !r.raporStatus).length} Belum dibuat</Badge>
            <span className="text-xs text-aam-muted ml-auto">{rows.length} siswa total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border">#</th>
                  <th className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border">Nama Siswa</th>
                  <th className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border">NIS</th>
                  <th className="px-3 py-2.5 text-center text-aam-muted font-semibold border-b border-aam-border">Status</th>
                  <th className="px-3 py-2.5 text-center text-aam-muted font-semibold border-b border-aam-border">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-aam-border">
                {rows.map((r, idx) => (
                  <tr key={r.siswaId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-aam-muted">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium">{r.nama}</td>
                    <td className="px-3 py-2 text-aam-muted">{r.nis ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={statusVariant(r.raporStatus)}>
                        {r.raporStatus ?? 'Belum'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        onClick={() => navigate(`/guru/rapor/${r.siswaId}`)}
                        id={`btn-rapor-siswa-${r.siswaId}`}
                      >
                        {r.raporStatus === 'FINAL' ? 'Lihat' : 'Kelola'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
