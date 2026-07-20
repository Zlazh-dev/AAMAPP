import React, { useState, useCallback, useEffect } from 'react';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { Table, ColumnDef } from '../../components/Table';
import { BackLink } from '../../components/BackLink';
import { Button } from '../../components/Button';

interface RewardSiswa {
  siswaId: number;
  siswaNama: string;
  siswaKelas?: string;
  saldo: number;
}

interface RewardData {
  sangatBaik: RewardSiswa[];
  baik: RewardSiswa[];
}

async function getProfilForExport() {
  try {
    const entries = await api.getPengaturan();
    const entry = (entries as any[]).find((e: any) => e.key === 'profil_sekolah');
    if (entry?.value) return typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
  } catch { /* ignore */ }
  return { nama: 'Sekolah', alamat: '', kabKota: '', logoUrl: '', kepsekNama: '', kepsekNip: '', kepsekJabatan: 'Kepala Sekolah' };
}

function flatRewardRows(data: RewardData) {
  return [
    ...data.sangatBaik.map(r => ({ siswaNama: r.siswaNama, siswaKelas: r.siswaKelas ?? '', saldo: r.saldo, kategori: 'Sangat Baik' })),
    ...data.baik.map(r => ({ siswaNama: r.siswaNama, siswaKelas: r.siswaKelas ?? '', saldo: r.saldo, kategori: 'Baik' })),
  ];
}

const EXPORT_COLS = [
  { header: 'Nama Siswa', key: 'siswaNama', width: 30 },
  { header: 'Kelas', key: 'siswaKelas', width: 10 },
  { header: 'Saldo', key: 'saldo', width: 10 },
  { header: 'Kategori', key: 'kategori', width: 15 },
];

const colsReward: ColumnDef<RewardSiswa>[] = [
  { header: 'Nama Siswa', cell: (r) => <span className="font-medium">{r.siswaNama}</span> },
  { header: 'Kelas', cell: (r) => <span className="text-aam-text-muted">{r.siswaKelas ?? '—'}</span> },
  { header: 'Saldo', width: 'w-20', cell: (r) => <Badge variant="green">{r.saldo}</Badge> },
];

export function RewardPage() {
  const toast = useToast();
  const [data, setData] = useState<RewardData>({ sangatBaik: [], baik: [] });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getReward?.();
      if (res) setData(res);
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data reward.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (fmt: 'excel' | 'pdf') => {
    const rows = flatRewardRows(data);
    if (!rows.length) { toast.show('error', 'Tidak ada data untuk diekspor.'); return; }
    setExporting(fmt);
    try {
      const profil = await getProfilForExport();
      if (fmt === 'excel') {
        const { exportToExcel } = await import('../../lib/exportExcel');
        await exportToExcel({ sheetName: 'Reward-Semester', title: 'Daftar Reward Semester', profil, columns: EXPORT_COLS, rows });
      } else {
        const { exportToPdf } = await import('../../lib/exportPdf');
        await exportToPdf({ title: 'Daftar Reward Semester', profil, columns: EXPORT_COLS, rows });
      }
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : `Gagal export ${fmt.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  };

  const total = data.sangatBaik.length + data.baik.length;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Reward Semester</h2>
          <p className="text-sm text-aam-text-muted mt-0.5">
            Sangat Baik (saldo = 500) &amp; Baik (400–490) — diturunkan dari saldo poin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon="table_view" onClick={() => handleExport('excel')} disabled={!!exporting} id="btn-export-excel-reward">
            {exporting === 'excel' ? 'Mengekspor...' : 'Excel'}
          </Button>
          <Button size="sm" variant="secondary" icon="picture_as_pdf" onClick={() => handleExport('pdf')} disabled={!!exporting} id="btn-export-pdf-reward">
            {exporting === 'pdf' ? 'Mengekspor...' : 'PDF'}
          </Button>
        </div>
      </div>

      <BackLink to="/kesiswaan/pelanggaran" />

      {loading ? <TableSkeleton rows={5} /> : total === 0 ? (
        <EmptyState icon="emoji_events" message="Belum ada siswa yang masuk daftar reward semester ini." />
      ) : (
        <div className="space-y-6">
          {/* Sangat Baik */}
          <Card icon="workspace_premium">
            <div className="flex items-center gap-2 mb-4 p-4 pb-0">
              <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: '1.25rem' }}>workspace_premium</span>
              <h3 className="font-bold text-aam-text">Sangat Baik</h3>
              <Badge variant="green">{data.sangatBaik.length} siswa</Badge>
              <span className="text-xs text-aam-text-muted">Saldo = 500 (poin utuh)</span>
            </div>
            <div className="px-4 pb-4">
              {data.sangatBaik.length === 0 ? (
                <p className="text-sm text-aam-text-muted">Tidak ada siswa dengan saldo penuh.</p>
              ) : (
                <Table columns={colsReward} data={data.sangatBaik} rowKey={(r) => r.siswaId} />
              )}
            </div>
          </Card>

          {/* Baik */}
          <Card icon="star">
            <div className="flex items-center gap-2 mb-4 p-4 pb-0">
              <span className="material-symbols-outlined text-blue-400" style={{ fontSize: '1.25rem' }}>star</span>
              <h3 className="font-bold text-aam-text">Baik</h3>
              <Badge variant="blue">{data.baik.length} siswa</Badge>
              <span className="text-xs text-aam-text-muted">Saldo 400–490</span>
            </div>
            <div className="px-4 pb-4">
              {data.baik.length === 0 ? (
                <p className="text-sm text-aam-text-muted">Tidak ada siswa dengan saldo 400–490.</p>
              ) : (
                <Table columns={[...colsReward.slice(0,2), { header: 'Saldo', width: 'w-20', cell: (r) => <Badge variant="blue">{r.saldo}</Badge> }]}
                  data={data.baik} rowKey={(r) => r.siswaId} />
              )}
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
