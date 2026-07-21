import React, { useState, useCallback, useEffect } from 'react';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { Table, ColumnDef } from '../../components/Table';
import { SubPageLayout } from '../../components/SubPageLinks';
import { Pagination } from '../../components/Pagination';
import { PageMenu } from '../../components/PageMenu';

/** Sub halaman Laporan Demerit (IA-HIERARCHY-V2). */
const DEMERIT_SUB_LINKS = [
  { key: 'tata-tertib', label: 'Tata Tertib', path: '/kesiswaan/tata-tertib', icon: 'gavel', description: 'Katalog butir pelanggaran & poin' },
];

interface DemeritRow {
  siswaId: number;
  siswaNama: string;
  siswaKelas?: string;
  poinR: number;
  poinS: number;
  poinB: number;
  poinSB: number;
  terpotong: number;
  saldo: number;
}

interface ColDef { header: string; key: keyof DemeritRow; align?: 'left' | 'right'; }

const COLS: ColDef[] = [
  { header: 'Nama Siswa', key: 'siswaNama' },
  { header: 'Kelas', key: 'siswaKelas' },
  { header: 'R (Ringan)', key: 'poinR', align: 'right' },
  { header: 'S (Sedang)', key: 'poinS', align: 'right' },
  { header: 'B (Berat)', key: 'poinB', align: 'right' },
  { header: 'SB (Sangat Berat)', key: 'poinSB', align: 'right' },
  { header: '\u03A3 Terpotong', key: 'terpotong', align: 'right' },
  { header: 'Saldo', key: 'saldo', align: 'right' },
];

async function getProfilForExport() {
  try {
    const entries = await api.getPengaturan();
    const entry = (entries as any[]).find((e: any) => e.key === 'profil_sekolah');
    if (entry?.value) return typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
  } catch { /* ignore */ }
  return { nama: 'Sekolah', alamat: '', kabKota: '', logoUrl: '', kepsekNama: '', kepsekNip: '', kepsekJabatan: 'Kepala Sekolah' };
}

async function doExportExcel(rows: DemeritRow[], total: DemeritRow | null) {
  const { exportToExcel } = await import('../../lib/exportExcel');
  const profil = await getProfilForExport();
  await exportToExcel({
    sheetName: 'Laporan-Demerit',
    title: 'Laporan Demerit Siswa',
    profil,
    columns: COLS.map(c => ({ header: c.header, key: String(c.key), width: 18 })),
    rows: rows.map(r => Object.fromEntries(COLS.map(c => [String(c.key), r[c.key] ?? '']))),
    totalRow: total ? Object.fromEntries(COLS.map(c => [String(c.key), total[c.key] ?? ''])) : undefined,
  });
}

async function doExportPdf(rows: DemeritRow[], total: DemeritRow | null) {
  const { exportToPdf } = await import('../../lib/exportPdf');
  const profil = await getProfilForExport();
  await exportToPdf({
    title: 'Laporan Demerit Siswa',
    profil,
    columns: COLS.map(c => ({ header: c.header, key: String(c.key) })),
    rows: rows.map(r => Object.fromEntries(COLS.map(c => [String(c.key), r[c.key] ?? '']))),
    totalRow: total ? Object.fromEntries(COLS.map(c => [String(c.key), total[c.key] ?? ''])) : undefined,
  });
}

function todayWIB(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
}
function nMonthsAgoWIB(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(d);
}

export function LaporanDemeritPage() {
  const toast = useToast();
  const [rows, setRows] = useState<DemeritRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const [dari, setDari] = useState(nMonthsAgoWIB(1));
  const [sampai, setSampai] = useState(todayWIB());
  const [kelasId, setKelasId] = useState('');
  const [kelasOptions, setKelasOptions] = useState<{ id: number; nama: string }[]>([]);

  // Load kelas options
  useEffect(() => {
    api.adminGetKelas({ limit: 100 }).then((r: any) => setKelasOptions(r.data ?? [])).catch(() => {});
  }, []);

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getLaporanDemerit?.({
        dari,
        sampai,
        kelasId: kelasId ? Number(kelasId) : undefined,
        page,
        limit: 25,
      });
      setRows(res?.data ?? res ?? []);
      if (res?.total != null) setMeta({ total: res.total, page: res.page ?? 1, limit: res.limit ?? 25 });
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat laporan demerit.');
    } finally {
      setLoading(false);
    }
  }, [dari, sampai, kelasId, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dari, sampai, kelasId]);

  // Total row
  const totalRow: DemeritRow | null = rows.length > 0 ? {
    siswaId: 0,
    siswaNama: 'TOTAL',
    siswaKelas: '',
    poinR: rows.reduce((s, r) => s + r.poinR, 0),
    poinS: rows.reduce((s, r) => s + r.poinS, 0),
    poinB: rows.reduce((s, r) => s + r.poinB, 0),
    poinSB: rows.reduce((s, r) => s + r.poinSB, 0),
    terpotong: rows.reduce((s, r) => s + r.terpotong, 0),
    saldo: rows.reduce((s, r) => s + r.saldo, 0),
  } : null;

  const handleExport = async (fmt: 'excel' | 'pdf') => {
    if (rows.length === 0) { toast.show('error', 'Tidak ada data untuk diekspor.'); return; }
    setExporting(fmt);
    try {
      if (fmt === 'excel') await doExportExcel(rows, totalRow);
      else await doExportPdf(rows, totalRow);
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : `Gagal export ${fmt.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  };

  function saldoVariant(saldo: number): 'red' | 'yellow' | 'green' {
    if (saldo <= 100) return 'red';
    if (saldo <= 250) return 'yellow';
    return 'green';
  }

  return (
    <PageContainer backLinkMobile={false}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Laporan Demerit</h2>
          <p className="text-sm text-aam-text-muted mt-0.5">Rekap \u03A3 pelanggaran per siswa: per kategori, terpotong, saldo.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon="table_view" onClick={() => handleExport('excel')} disabled={!!exporting} id="btn-export-excel-demerit">
            {exporting === 'excel' ? 'Mengekspor...' : 'Excel'}
          </Button>
          <Button size="sm" variant="secondary" icon="picture_as_pdf" onClick={() => handleExport('pdf')} disabled={!!exporting} id="btn-export-pdf-demerit">
            {exporting === 'pdf' ? 'Mengekspor...' : 'PDF'}
          </Button>
        </div>
      </div>

      <SubPageLayout links={DEMERIT_SUB_LINKS}>

      {/* Filter */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Dari</label>
            <input type="date" className="rounded-md border border-aam-border px-3 py-2 text-sm"
              value={dari} onChange={e => setDari(e.target.value)} id="input-dari-demerit" />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Sampai</label>
            <input type="date" className="rounded-md border border-aam-border px-3 py-2 text-sm"
              value={sampai} onChange={e => setSampai(e.target.value)} id="input-sampai-demerit" />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Kelas</label>
            <select className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
              value={kelasId} onChange={e => setKelasId(e.target.value)} id="select-kelas-demerit">
              <option value="">Semua Kelas</option>
              {kelasOptions.map((k: any) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={load} id="btn-filter-demerit">Tampilkan</Button>
          </div>
        </div>
      </Card>

      {/* Tabel */}
      <Card icon="bar_chart">
        {loading ? <TableSkeleton rows={6} /> : rows.length === 0 ? (
          <EmptyState icon="bar_chart" message="Tidak ada data pelanggaran pada rentang yang dipilih." />
        ) : (
          <>
            <Table
              columns={[
                { header: 'Nama Siswa', cell: (r) => <span className="font-medium">{r.siswaNama}</span> },
                { header: 'Kelas', cell: (r) => <span className="text-aam-text-muted">{r.siswaKelas ?? '\u2014'}</span> },
                { header: 'R', align: 'right', cell: (r) => String(r.poinR) },
                { header: 'S', align: 'right', cell: (r) => String(r.poinS) },
                { header: 'B', align: 'right', cell: (r) => String(r.poinB) },
                { header: 'SB', align: 'right', cell: (r) => String(r.poinSB) },
                { header: 'Terpotong', align: 'right', cell: (r) => <span className="font-medium">{r.terpotong}</span> },
                { header: 'Saldo', align: 'right', cell: (r) => <Badge variant={saldoVariant(r.saldo)}>{r.saldo}</Badge> },
              ] as ColumnDef<DemeritRow>[]}
              data={rows}
              rowKey={(r) => r.siswaId}
            />
            {totalRow && (
              <div className="border-t border-aam-border bg-gray-50 px-3 py-2 flex flex-wrap gap-4 text-sm font-bold text-aam-text">
                <span>TOTAL:</span>
                <span>R={totalRow.poinR}</span>
                <span>S={totalRow.poinS}</span>
                <span>B={totalRow.poinB}</span>
                <span>SB={totalRow.poinSB}</span>
                <span>Terpotong={totalRow.terpotong}</span>
              </div>
            )}
            <p className="text-xs text-aam-text-muted px-3 pb-2">Total siswa: {rows.length}</p>
            <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={setPage} loading={loading} />
          </>
        )}
      </Card>
      </SubPageLayout>
    </PageContainer>
  );
}
