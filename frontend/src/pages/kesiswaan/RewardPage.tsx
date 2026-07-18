import React, { useState, useCallback, useEffect } from 'react';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

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
    } catch {
      toast.show('error', 'Gagal memuat data reward.');
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
        await exportToExcel({
          sheetName: 'Reward-Semester',
          title: 'Daftar Reward Semester',
          profil,
          columns: EXPORT_COLS,
          rows,
        });
      } else {
        const { exportToPdf } = await import('../../lib/exportPdf');
        await exportToPdf({
          title: 'Daftar Reward Semester',
          profil,
          columns: EXPORT_COLS,
          rows,
        });
      }
    } catch {
      toast.show('error', `Gagal export ${fmt.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  };

  const total = data.sangatBaik.length + data.baik.length;

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Reward Semester</h2>
          <p className="text-sm text-aam-muted mt-0.5">
            Sangat Baik (saldo = 500) &amp; Baik (400–490) — diturunkan dari saldo poin.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => handleExport('excel')}
            disabled={exporting !== null} id="btn-export-excel-reward">
            {exporting === 'excel' ? 'Mengekspor...' : '↓ Excel'}
          </Button>
          <Button variant="secondary" onClick={() => handleExport('pdf')}
            disabled={exporting !== null} id="btn-export-pdf-reward">
            {exporting === 'pdf' ? 'Mengekspor...' : '↓ PDF'}
          </Button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : total === 0 ? (
        <EmptyState icon="emoji_events" message="Belum ada siswa yang masuk daftar reward semester ini." />
      ) : (
        <div className="space-y-6">
          {/* Sangat Baik */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-bold text-aam-text">🏆 Sangat Baik</h3>
              <Badge variant="green">{data.sangatBaik.length} siswa</Badge>
              <span className="text-xs text-aam-muted">Saldo = 500 (poin utuh)</span>
            </div>
            {data.sangatBaik.length === 0 ? (
              <p className="text-sm text-aam-muted">Tidak ada siswa dengan saldo penuh.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Nama Siswa', 'Kelas', 'Saldo'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aam-border">
                    {data.sangatBaik.map(r => (
                      <tr key={r.siswaId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{r.siswaNama}</td>
                        <td className="px-3 py-2 text-aam-muted">{r.siswaKelas ?? '—'}</td>
                        <td className="px-3 py-2"><Badge variant="green">{r.saldo}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Baik */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-bold text-aam-text">⭐ Baik</h3>
              <Badge variant="blue">{data.baik.length} siswa</Badge>
              <span className="text-xs text-aam-muted">Saldo 400–490</span>
            </div>
            {data.baik.length === 0 ? (
              <p className="text-sm text-aam-muted">Tidak ada siswa dengan saldo 400–490.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Nama Siswa', 'Kelas', 'Saldo'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aam-border">
                    {data.baik.map(r => (
                      <tr key={r.siswaId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{r.siswaNama}</td>
                        <td className="px-3 py-2 text-aam-muted">{r.siswaKelas ?? '—'}</td>
                        <td className="px-3 py-2"><Badge variant="blue">{r.saldo}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
