import React, { useState, useCallback } from 'react';
import { api } from '../../../api/client';
import { PageContainer } from '../../../components/PageContainer';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { useToast } from '../../../components/Toast';
import { BackLink } from '../../../components/BackLink';

// ── Helpers ───────────────────────────────────────────────────────────────

function monthAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
function today(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

type Row = {
  guruId?: number; guruNama?: string; kelas?: string; mapel?: string;
  hadir?: number; terlambat?: number; izin?: number; sakit?: number;
  dinas?: number; alpha?: number; libur?: number; persen?: string | number;
  totalKbm?: number; terlaksana?: number;
  siswaId?: number; siswaNama?: string;
};

interface ColDef { header: string; key: keyof Row; align?: 'left' | 'right'; }


async function getProfilForExport() {
  try {
    const entries = await api.getPengaturan();
    const entry = entries.find((e: any) => e.key === 'profil_sekolah');
    if (entry?.value) {
      return typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
    }
  } catch { /* ignore */ }
  return {
    nama: 'Sekolah', alamat: '', kabKota: '', logoUrl: '',
    kepsekNama: '', kepsekNip: '', kepsekJabatan: 'Kepala Sekolah',
  };
}

async function doExportExcel(
  title: string, cols: ColDef[], rows: Row[], totalRow: Row | null
) {
  const { exportToExcel } = await import('../../../lib/exportExcel');
  const profil = await getProfilForExport();
  await exportToExcel({
    sheetName: title.replace(/\s+/g, '-').slice(0, 30),
    title,
    profil,
    columns: cols.map(c => ({ header: c.header, key: String(c.key), width: 18 })),
    rows: rows.map(r => Object.fromEntries(cols.map(c => [String(c.key), r[c.key] ?? '']))),
    totalRow: totalRow
      ? Object.fromEntries(cols.map(c => [String(c.key), totalRow[c.key] ?? '']))
      : undefined,
  });
}

async function doExportPdf(
  title: string, cols: ColDef[], rows: Row[], totalRow: Row | null
) {
  const { exportToPdf } = await import('../../../lib/exportPdf');
  const profil = await getProfilForExport();
  await exportToPdf({
    title,
    profil,
    columns: cols.map(c => ({ header: c.header, key: String(c.key) })),
    rows: rows.map(r => Object.fromEntries(cols.map(c => [String(c.key), r[c.key] ?? '']))),
    totalRow: totalRow
      ? Object.fromEntries(cols.map(c => [String(c.key), totalRow[c.key] ?? '']))
      : undefined,
  });
}

// ── Generic laporan table ─────────────────────────────────────────────────

interface LaporanTableProps {
  title: string;
  cols: ColDef[];
  rows: Row[];
  totalRow: Row | null;
  loading: boolean;
  exporting: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

function LaporanTable({ title, cols, rows, totalRow, loading, exporting, onExportExcel, onExportPdf }: LaporanTableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold text-aam-text">{title}</h3>
        <div className="flex gap-2">
          <Button
            id={`btn-export-excel-${title.replace(/\s+/g, '-').toLowerCase()}`}
            variant="secondary"
            onClick={onExportExcel}
            disabled={exporting || rows.length === 0}
            className="text-xs"
          >
            📊 Excel
          </Button>
          <Button
            id={`btn-export-pdf-${title.replace(/\s+/g, '-').toLowerCase()}`}
            variant="secondary"
            onClick={onExportPdf}
            disabled={exporting || rows.length === 0}
            className="text-xs"
          >
            📄 PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon="table_view" message="Tidak ada data untuk rentang dan filter yang dipilih." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-aam-border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {cols.map(c => (
                  <th key={String(c.key)}
                    className="px-3 py-2.5 font-semibold text-aam-muted text-left whitespace-nowrap border-b border-aam-border">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-aam-border">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {cols.map(c => (
                    <td key={String(c.key)}
                      className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {String(row[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Baris TOTAL */}
              {totalRow && (
                <tr className="bg-yellow-50 font-semibold">
                  {cols.map(c => (
                    <td key={String(c.key)} className="px-3 py-2 text-left">
                      {String(totalRow[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 1. Laporan Harian Guru ────────────────────────────────────────────────

const COLS_HARIAN: ColDef[] = [
  { header: 'Nama Guru', key: 'guruNama' },
  { header: 'Hadir', key: 'hadir', align: 'right' },
  { header: 'Terlambat', key: 'terlambat', align: 'right' },
  { header: 'Izin', key: 'izin', align: 'right' },
  { header: 'Sakit', key: 'sakit', align: 'right' },
  { header: 'Dinas', key: 'dinas', align: 'right' },
  { header: 'Alpha', key: 'alpha', align: 'right' },
  { header: 'Libur', key: 'libur', align: 'right' },
  { header: '% Hadir', key: 'persen', align: 'right' },
];

export function LaporanHarianGuruPage() {
  const toast = useToast();
  const [dari, setDari] = useState(monthAgo());
  const [sampai, setSampai] = useState(today());
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRow, setTotalRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!dari || !sampai) return;
    setLoading(true);
    try {
      const res = await api.adminGetLaporanHarianGuru({ dari, sampai });
      const data = res.data.map(r => ({
        ...r,
        persen: r.persen + '%',
      })) as Row[];
      setRows(data);
      // Baris TOTAL
      if (data.length > 0) {
        const sum = (k: keyof Row) => data.reduce((a, r) => a + (Number(r[k]) || 0), 0);
        const totalH = sum('hadir'), totalT = sum('terlambat'), totalA = sum('alpha');
        const totalAll = data.length;
        setTotalRow({
          guruNama: 'TOTAL',
          hadir: totalH, terlambat: totalT, izin: sum('izin'), sakit: sum('sakit'),
          dinas: sum('dinas'), alpha: totalA, libur: sum('libur'),
          persen: (totalAll > 0 ? Math.round((totalH + totalT) / totalAll * 100) : 0) + '%',
        } as Row);
      } else {
        setTotalRow(null);
      }
      setHasLoaded(true);
    } catch {
      toast.show('error', 'Gagal memuat laporan harian guru.');
    } finally {
      setLoading(false);
    }
  }, [dari, sampai]);

  const handleExcel = async () => {
    setExporting(true);
    await doExportExcel('Laporan Harian Guru', COLS_HARIAN, rows, totalRow).catch(e => {
      toast.show('error', 'Gagal export Excel: ' + e.message);
    });
    setExporting(false);
  };

  const handlePdf = async () => {
    setExporting(true);
    await doExportPdf('Laporan Harian Guru', COLS_HARIAN, rows, totalRow).catch(e => {
      toast.show('error', 'Gagal export PDF: ' + e.message);
    });
    setExporting(false);
  };

  return (
    <PageContainer>
      <BackLink to="/admin/laporan" />
      <div className="mb-6">
        <h2 className="text-xl font-bold text-aam-text">Laporan Harian Guru</h2>
        <p className="text-sm text-aam-muted mt-0.5">Rekapitulasi kehadiran harian per guru dalam rentang tanggal.</p>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-aam-muted mb-1">Dari</label>
            <input type="date" className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white min-h-[40px]"
              value={dari} onChange={e => setDari(e.target.value)} id="harian-dari" />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-muted mb-1">Sampai</label>
            <input type="date" className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white min-h-[40px]"
              value={sampai} onChange={e => setSampai(e.target.value)} id="harian-sampai" />
          </div>
          <Button onClick={load} disabled={loading} id="btn-tampilkan-harian">
            Tampilkan
          </Button>
        </div>
      </Card>

      {hasLoaded && (
        <Card>
          <LaporanTable
            title="Rekap Harian Guru"
            cols={COLS_HARIAN}
            rows={rows}
            totalRow={totalRow}
            loading={loading}
            exporting={exporting}
            onExportExcel={handleExcel}
            onExportPdf={handlePdf}
          />
        </Card>
      )}
    </PageContainer>
  );
}

// ── 2. Laporan Keterlaksanaan KBM ─────────────────────────────────────────

const COLS_KBM: ColDef[] = [
  { header: 'Guru', key: 'guruNama' },
  { header: 'Kelas', key: 'kelas' },
  { header: 'Mapel', key: 'mapel' },
  { header: 'Total KBM', key: 'totalKbm', align: 'right' },
  { header: 'Terlaksana', key: 'terlaksana', align: 'right' },
  { header: '% Terlaksana', key: 'persen', align: 'right' },
];

export function LaporanKeterlaksanaanPage() {
  const toast = useToast();
  const [dari, setDari] = useState(monthAgo());
  const [sampai, setSampai] = useState(today());
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRow, setTotalRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!dari || !sampai) return;
    setLoading(true);
    try {
      const res = await api.adminGetLaporanKeterlaksanaan({ dari, sampai });
      const data = res.data.map(r => ({ ...r, persen: r.persen + '%' })) as Row[];
      setRows(data);
      if (data.length > 0) {
        const totalKbm = data.reduce((a, r) => a + (Number(r.totalKbm) || 0), 0);
        const terlaksana = data.reduce((a, r) => a + (Number(r.terlaksana) || 0), 0);
        setTotalRow({
          guruNama: 'TOTAL', kelas: '', mapel: '', totalKbm, terlaksana,
          persen: (totalKbm > 0 ? Math.round(terlaksana / totalKbm * 100) : 0) + '%',
        } as Row);
      } else {
        setTotalRow(null);
      }
      setHasLoaded(true);
    } catch {
      toast.show('error', 'Gagal memuat laporan keterlaksanaan KBM.');
    } finally {
      setLoading(false);
    }
  }, [dari, sampai]);

  const handleExcel = async () => {
    setExporting(true);
    await doExportExcel('Laporan Keterlaksanaan KBM', COLS_KBM, rows, totalRow).catch(e => {
      toast.show('error', 'Gagal export Excel: ' + e.message);
    });
    setExporting(false);
  };

  const handlePdf = async () => {
    setExporting(true);
    await doExportPdf('Laporan Keterlaksanaan KBM', COLS_KBM, rows, totalRow).catch(e => {
      toast.show('error', 'Gagal export PDF: ' + e.message);
    });
    setExporting(false);
  };

  return (
    <PageContainer>
      <BackLink to="/admin/laporan" />
      <div className="mb-6">
        <h2 className="text-xl font-bold text-aam-text">Laporan Keterlaksanaan KBM</h2>
        <p className="text-sm text-aam-muted mt-0.5">Rekapitulasi KBM terlaksana vs total per guru/kelas/mapel.</p>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-aam-muted mb-1">Dari</label>
            <input type="date" className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white min-h-[40px]"
              value={dari} onChange={e => setDari(e.target.value)} id="kbm-dari" />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-muted mb-1">Sampai</label>
            <input type="date" className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white min-h-[40px]"
              value={sampai} onChange={e => setSampai(e.target.value)} id="kbm-sampai" />
          </div>
          <Button onClick={load} disabled={loading} id="btn-tampilkan-kbm">
            Tampilkan
          </Button>
        </div>
      </Card>

      {hasLoaded && (
        <Card>
          <LaporanTable
            title="Keterlaksanaan KBM"
            cols={COLS_KBM}
            rows={rows}
            totalRow={totalRow}
            loading={loading}
            exporting={exporting}
            onExportExcel={handleExcel}
            onExportPdf={handlePdf}
          />
        </Card>
      )}
    </PageContainer>
  );
}

// ── 3. Laporan Kehadiran Siswa ────────────────────────────────────────────

const COLS_SISWA: ColDef[] = [
  { header: 'Nama Siswa', key: 'siswaNama' },
  { header: 'Kelas', key: 'kelas' },
  { header: 'Hadir', key: 'hadir', align: 'right' },
  { header: 'Sakit', key: 'sakit', align: 'right' },
  { header: 'Izin', key: 'izin', align: 'right' },
  { header: 'Alpha', key: 'alpha', align: 'right' },
  { header: 'Terlambat', key: 'terlambat', align: 'right' },
  { header: '% Hadir', key: 'persen', align: 'right' },
];

export function LaporanSiswaPage() {
  const toast = useToast();
  const [dari, setDari] = useState(monthAgo());
  const [sampai, setSampai] = useState(today());
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRow, setTotalRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!dari || !sampai) return;
    setLoading(true);
    try {
      const res = await api.adminGetLaporanSiswa({ dari, sampai });
      const data = res.data.map(r => ({ ...r, persen: r.persen + '%' })) as Row[];
      setRows(data);
      if (data.length > 0) {
        setTotalRow({
          siswaNama: 'TOTAL', kelas: '',
          hadir: data.reduce((a, r) => a + (Number(r.hadir) || 0), 0),
          sakit: data.reduce((a, r) => a + (Number(r.sakit) || 0), 0),
          izin: data.reduce((a, r) => a + (Number(r.izin) || 0), 0),
          alpha: data.reduce((a, r) => a + (Number(r.alpha) || 0), 0),
          terlambat: data.reduce((a, r) => a + (Number(r.terlambat) || 0), 0),
          persen: '',
        } as Row);
      } else {
        setTotalRow(null);
      }
      setHasLoaded(true);
    } catch {
      toast.show('error', 'Gagal memuat laporan siswa.');
    } finally {
      setLoading(false);
    }
  }, [dari, sampai]);

  const handleExcel = async () => {
    setExporting(true);
    await doExportExcel('Laporan Kehadiran Siswa', COLS_SISWA, rows, totalRow).catch(e => {
      toast.show('error', 'Gagal export Excel: ' + e.message);
    });
    setExporting(false);
  };

  const handlePdf = async () => {
    setExporting(true);
    await doExportPdf('Laporan Kehadiran Siswa', COLS_SISWA, rows, totalRow).catch(e => {
      toast.show('error', 'Gagal export PDF: ' + e.message);
    });
    setExporting(false);
  };

  return (
    <PageContainer>
      <BackLink to="/admin/laporan" />
      <div className="mb-6">
        <h2 className="text-xl font-bold text-aam-text">Laporan Kehadiran Siswa</h2>
        <p className="text-sm text-aam-muted mt-0.5">Rekapitulasi H/S/I/A/T per siswa dalam rentang tanggal.</p>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-aam-muted mb-1">Dari</label>
            <input type="date" className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white min-h-[40px]"
              value={dari} onChange={e => setDari(e.target.value)} id="siswa-dari" />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-muted mb-1">Sampai</label>
            <input type="date" className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white min-h-[40px]"
              value={sampai} onChange={e => setSampai(e.target.value)} id="siswa-sampai" />
          </div>
          <Button onClick={load} disabled={loading} id="btn-tampilkan-siswa">
            Tampilkan
          </Button>
        </div>
      </Card>

      {hasLoaded && (
        <Card>
          <LaporanTable
            title="Kehadiran Siswa"
            cols={COLS_SISWA}
            rows={rows}
            totalRow={totalRow}
            loading={loading}
            exporting={exporting}
            onExportExcel={handleExcel}
            onExportPdf={handlePdf}
          />
        </Card>
      )}
    </PageContainer>
  );
}
