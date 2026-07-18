/**
 * exportExcel.ts — lazy export ke Excel pakai exceljs (§12.15).
 *
 * PENTING: file ini TIDAK BOLEH diimpor langsung dari bundle utama.
 * Gunakan dynamic import di komponen laporan.
 */

import type { ProfilSekolah } from '../api/client';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelExportParams {
  sheetName: string;
  title: string;
  profil: ProfilSekolah;
  columns: ExcelColumn[];
  rows: Record<string, string | number>[];
  totalRow?: Record<string, string | number>;
}

/**
 * Generate dan unduh file Excel (.xlsx) dengan kop sekolah.
 * Dynamic-import exceljs — hanya dimuat saat tombol ditekan.
 */
export async function exportToExcel(params: ExcelExportParams): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');

  const wb = new ExcelJS.Workbook();
  wb.creator = params.profil.nama;
  wb.created = new Date();

  const ws = wb.addWorksheet(params.sheetName);

  // ── Kop sekolah ──────────────────────────────────────────────────────────
  ws.mergeCells('A1:' + String.fromCharCode(64 + params.columns.length) + '1');
  const kopCell = ws.getCell('A1');
  kopCell.value = params.profil.nama.toUpperCase();
  kopCell.font = { bold: true, size: 14 };
  kopCell.alignment = { horizontal: 'center' };

  ws.mergeCells('A2:' + String.fromCharCode(64 + params.columns.length) + '2');
  const alamatCell = ws.getCell('A2');
  alamatCell.value = params.profil.alamat + ', ' + params.profil.kabKota;
  alamatCell.alignment = { horizontal: 'center' };

  ws.mergeCells('A3:' + String.fromCharCode(64 + params.columns.length) + '3');
  ws.getCell('A3').value = '';

  ws.mergeCells('A4:' + String.fromCharCode(64 + params.columns.length) + '4');
  const titleCell = ws.getCell('A4');
  titleCell.value = params.title;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'center' };

  ws.addRow([]);

  // ── Header kolom ──────────────────────────────────────────────────────────
  const headerRow = ws.addRow(params.columns.map(c => c.header));
  headerRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    cell.alignment = { horizontal: 'center' };
  });

  // Lebar kolom
  params.columns.forEach((col, i) => {
    ws.getColumn(i + 1).key = col.key;
    ws.getColumn(i + 1).width = col.width ?? 18;
  });

  // ── Data ─────────────────────────────────────────────────────────────────
  params.rows.forEach(row => {
    const r = ws.addRow(params.columns.map(c => row[c.key] ?? ''));
    r.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
  });

  // ── Baris TOTAL ───────────────────────────────────────────────────────────
  if (params.totalRow) {
    const tr = ws.addRow(params.columns.map(c => params.totalRow![c.key] ?? ''));
    tr.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
  }

  // ── TTD kepsek ────────────────────────────────────────────────────────────
  ws.addRow([]);
  ws.addRow([]);
  const ttdStart = ws.lastRow!.number + 1;
  ws.addRow([
    '', '', '',
    `Mengetahui,`,
  ]);
  ws.addRow([
    '', '', '',
    params.profil.kepsekJabatan,
  ]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([
    '', '', '',
    params.profil.kepsekNama,
  ]);
  ws.addRow([
    '', '', '',
    'NIP. ' + params.profil.kepsekNip,
  ]);
  void ttdStart;

  // ── Download ──────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${params.sheetName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
