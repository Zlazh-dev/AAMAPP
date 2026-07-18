/**
 * exportPdf.ts — lazy export ke PDF pakai pdfmake (§12.15).
 *
 * PENTING: file ini TIDAK BOLEH diimpor langsung dari bundle utama.
 * Gunakan dynamic import di komponen laporan.
 */

import type { ProfilSekolah } from '../api/client';

export interface PdfColumn {
  header: string;
  key: string;
  width?: number; // relative width (sum should be ~100)
}

export interface PdfExportParams {
  title: string;
  profil: ProfilSekolah;
  columns: PdfColumn[];
  rows: Record<string, string | number>[];
  totalRow?: Record<string, string | number>;
}

type TDocumentDefinitions = import('pdfmake/interfaces').TDocumentDefinitions;
type Content = import('pdfmake/interfaces').Content;

/**
 * Generate dan unduh PDF dengan kop sekolah, tabel data + baris total.
 */
export async function exportToPdf(params: PdfExportParams): Promise<void> {
  // Dynamic-import kedua modul pdfmake
  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);

  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule;
  const pdfFonts = (pdfFontsModule as any).default ?? pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs;

  const colWidths = params.columns.map(c => c.width ? `${c.width}%` : '*');

  // Header baris tabel
  const headerRow = params.columns.map(c => ({
    text: c.header, bold: true, fillColor: '#D4EDDA',
    alignment: 'center' as const, fontSize: 9,
  }));

  // Baris data
  const dataRows = params.rows.map(row =>
    params.columns.map(c => ({
      text: String(row[c.key] ?? ''), fontSize: 9,
    }))
  );

  // Baris TOTAL
  const totalRowContent: Content[][] = params.totalRow
    ? [params.columns.map((c, i) => ({
        text: String(params.totalRow![c.key] ?? ''),
        bold: true, fillColor: '#FFF3CD', fontSize: 9,
        alignment: (i === 0 ? 'left' : 'center') as any,
      }))]
    : [];

  const tableBody: Content[][] = [headerRow as Content[], ...dataRows, ...totalRowContent];

  const docDef: TDocumentDefinitions = {
    pageOrientation: 'landscape',
    pageMargins: [40, 60, 40, 60],
    content: [
      // Kop sekolah
      { text: params.profil.nama.toUpperCase(), bold: true, fontSize: 14, alignment: 'center' },
      { text: `${params.profil.alamat}, ${params.profil.kabKota}`, fontSize: 10, alignment: 'center' },
      { text: '', margin: [0, 4] },
      { text: params.title, bold: true, fontSize: 12, alignment: 'center' },
      { text: '', margin: [0, 8] },

      // Tabel data
      {
        table: {
          headerRows: 1,
          widths: colWidths,
          body: tableBody,
        },
        layout: 'lightHorizontalLines',
      },

      // TTD kepsek
      { text: '', margin: [0, 16] },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            stack: [
              { text: 'Mengetahui,', alignment: 'center', fontSize: 10 },
              { text: params.profil.kepsekJabatan, alignment: 'center', fontSize: 10 },
              { text: '\n\n\n', fontSize: 10 },
              { text: params.profil.kepsekNama, bold: true, alignment: 'center', fontSize: 10 },
              { text: `NIP. ${params.profil.kepsekNip}`, alignment: 'center', fontSize: 9 },
            ],
          },
        ],
      },
    ],
  };

  pdfMake.createPdf(docDef).download(
    `${params.title.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
  );
}
