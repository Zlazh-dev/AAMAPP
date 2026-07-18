import React, { useState, useCallback } from 'react';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

// ── Helpers ────────────────────────────────────────────────────────────────

function currentMonthWIB(): string {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  // Format as YYYY-MM
  return `${map.year}-${map.month}`;
}

function bulanLabel(bulan: string): string {
  const [y, m] = bulan.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  });
}

// ── Column def ─────────────────────────────────────────────────────────────

const COLS = [
  { key: 'guruNama', header: 'Nama Guru', width: 18 },
  { key: 'nip', header: 'NIP', width: 16 },
  { key: 'hariWajib', header: 'Hari Wajib', width: 10 },
  { key: 'hadir', header: 'Hadir', width: 8 },
  { key: 'terlambat', header: 'Terlambat', width: 9 },
  { key: 'izin', header: 'Izin', width: 8 },
  { key: 'sakit', header: 'Sakit', width: 8 },
  { key: 'dinas', header: 'Dinas', width: 8 },
  { key: 'alpha', header: 'Alpha', width: 8 },
  { key: 'libur', header: 'Libur', width: 8 },
  { key: 'persen', header: '% Hadir', width: 9 },
] as const;

type ColKey = typeof COLS[number]['key'];

type RekapRow = {
  guruId: number; guruNama: string; nip: string | null;
  hariWajib: number; hadir: number; terlambat: number;
  izin: number; sakit: number; dinas: number; alpha: number;
  libur: number; persen: number;
};

// ── Export helpers ─────────────────────────────────────────────────────────

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

function buildExportRows(rows: RekapRow[]) {
  return rows.map(r => ({
    ...r,
    nip: r.nip ?? '-',
    persen: r.persen + '%',
  })) as Record<string, string | number>[];
}

function buildTotalRow(rows: RekapRow[]): Record<string, string | number> {
  const sum = (k: keyof RekapRow) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const totalH = sum('hadir'), totalT = sum('terlambat'), totalW = sum('hariWajib');
  return {
    guruNama: 'TOTAL', nip: '',
    hariWajib: totalW, hadir: totalH, terlambat: totalT,
    izin: sum('izin'), sakit: sum('sakit'), dinas: sum('dinas'),
    alpha: sum('alpha'), libur: sum('libur'),
    persen: totalW > 0 ? Math.round((totalH + totalT) / rows.length * 100) + '%' : '',
  };
}

// ── Main Page ──────────────────────────────────────────────────────────────

/**
 * /tu/rekap-guru — TU: rekap bulanan kehadiran guru (basis perhitungan gaji).
 */
export function TuRekapGuruPage() {
  const toast = useToast();
  const [bulan, setBulan] = useState(currentMonthWIB);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!bulan) return;
    setLoading(true);
    try {
      const res = await api.getTuRekapGuru(bulan);
      setRows(res.data);
      setHasLoaded(true);
    } catch {
      toast.show('error', 'Gagal memuat rekap guru. Pastikan backend F4c sudah live.');
    } finally {
      setLoading(false);
    }
  }, [bulan]);

  const handleExportExcel = async () => {
    if (rows.length === 0) return;
    setExporting(true);
    try {
      const { exportToExcel } = await import('../../lib/exportExcel');
      const profil = await getProfilForExport();
      await exportToExcel({
        sheetName: `Rekap-Guru-${bulan}`,
        title: `Rekap Kehadiran Guru — ${bulanLabel(bulan)}`,
        profil,
        columns: COLS.map(c => ({ header: c.header, key: c.key, width: c.width })),
        rows: buildExportRows(rows),
        totalRow: buildTotalRow(rows),
      });
    } catch (e: any) {
      toast.show('error', 'Gagal export Excel: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (rows.length === 0) return;
    setExporting(true);
    try {
      const { exportToPdf } = await import('../../lib/exportPdf');
      const profil = await getProfilForExport();
      await exportToPdf({
        title: `Rekap Kehadiran Guru — ${bulanLabel(bulan)}`,
        profil,
        columns: COLS.map(c => ({ header: c.header, key: c.key })),
        rows: buildExportRows(rows),
        totalRow: buildTotalRow(rows),
      });
    } catch (e: any) {
      toast.show('error', 'Gagal export PDF: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Rekap Guru</h2>
          <p className="text-sm text-aam-muted mt-0.5">
            Rekap kehadiran bulanan per guru (basis perhitungan gaji).
          </p>
        </div>
      </div>

      {/* Filter pemilih bulan */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-aam-muted mb-1">Bulan</label>
            <input
              type="month"
              id="tu-rekap-bulan"
              className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white min-h-[40px]"
              value={bulan}
              onChange={e => setBulan(e.target.value)}
            />
          </div>
          <Button onClick={load} disabled={loading} id="btn-tampilkan-rekap">
            Tampilkan
          </Button>
        </div>
      </Card>

      {/* Tabel hasil */}
      {hasLoaded && (
        <Card>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-semibold text-aam-text">
              Rekap {bulan ? bulanLabel(bulan) : ''}
            </h3>
            <div className="flex gap-2">
              <Button
                id="btn-export-excel-rekap"
                variant="secondary"
                onClick={handleExportExcel}
                disabled={exporting || rows.length === 0}
                className="text-xs"
              >
                📊 Excel
              </Button>
              <Button
                id="btn-export-pdf-rekap"
                variant="secondary"
                onClick={handleExportPdf}
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
            <EmptyState
              icon="table_view"
              message="Tidak ada data rekap untuk bulan yang dipilih."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-aam-border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {COLS.map(c => (
                      <th key={c.key}
                        className="px-3 py-2.5 font-semibold text-aam-muted text-left whitespace-nowrap border-b border-aam-border">
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-aam-border">
                  {rows.map(row => (
                    <tr key={row.guruId} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{row.guruNama}</td>
                      <td className="px-3 py-2 text-aam-muted">{row.nip ?? '-'}</td>
                      <td className="px-3 py-2 text-right">{row.hariWajib}</td>
                      <td className="px-3 py-2 text-right">{row.hadir}</td>
                      <td className="px-3 py-2 text-right">{row.terlambat}</td>
                      <td className="px-3 py-2 text-right">{row.izin}</td>
                      <td className="px-3 py-2 text-right">{row.sakit}</td>
                      <td className="px-3 py-2 text-right">{row.dinas}</td>
                      <td className="px-3 py-2 text-right text-red-600">{row.alpha}</td>
                      <td className="px-3 py-2 text-right">{row.libur}</td>
                      <td className="px-3 py-2 text-right font-medium">{row.persen}%</td>
                    </tr>
                  ))}
                  {/* Baris TOTAL */}
                  <tr className="bg-yellow-50 font-semibold">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2" />
                    {(['hariWajib','hadir','terlambat','izin','sakit','dinas','alpha','libur'] as ColKey[]).map(k => (
                      <td key={k} className="px-3 py-2 text-right">
                        {rows.reduce((a, r) => a + (Number(r[k as keyof RekapRow]) || 0), 0)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      {rows.length > 0
                        ? Math.round(rows.reduce((a, r) => a + r.persen, 0) / rows.length) + '%'
                        : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </PageContainer>
  );
}
