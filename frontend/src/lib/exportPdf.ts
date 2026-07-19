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

// ── F6-INTEGRASI: Rapor Penuh (akademik + kokurikuler + ekskul) ─────────────

export interface RaporKokurikulerDimensi {
  namaDimensi: string;
  nilaiAkhir: string | null;
  deskripsi: string;
}

export interface RaporEkskulItem {
  nama: string;
  kehadiranPersen: number | null;
  flagMerah: boolean;
  tujuan: { deskripsi: string; nilai: string | null }[];
  deskripsi: string;
}

export interface RaporPenuhParams {
  profil: ProfilSekolah;
  siswa: {
    nama: string;
    nis: string | null;
    kelas: string;
    semester: number;
    tahunAjaran?: string;
    status: string;
  };
  kehadiran: { sakit: number; izin: number; alpha: number };
  mapel: {
    mapelNama: string;
    nilaiAkhir: number | null;
    nilaiKatrol: number | null;
    deskripsiAuto: string;
    deskripsiOverride: string | null;
  }[];
  kokurikuler: RaporKokurikulerDimensi[];
  ekstrakurikuler: RaporEkskulItem[];
  catatanWali: string | null;
  kkm?: number;
}

export async function exportRaporPenuh(params: RaporPenuhParams): Promise<void> {
  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule;
  const pdfFonts = (pdfFontsModule as any).default ?? pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs;

  const kkm = params.kkm ?? 75;
  const { siswa, kehadiran, mapel, kokurikuler, ekstrakurikuler, profil, catatanWali } = params;

  const sec = (text: string): any => ({ text, bold: true, fontSize: 11, decoration: 'underline', margin: [0, 10, 0, 4] });
  const ls = { layout: 'lightHorizontalLines' as const };

  // Nilai mapel rows
  const mapelBody: any[][] = [
    [
      { text: 'No', bold: true, fillColor: '#D4EDDA', fontSize: 9 },
      { text: 'Mata Pelajaran', bold: true, fillColor: '#D4EDDA', fontSize: 9 },
      { text: 'Nilai', bold: true, fillColor: '#D4EDDA', fontSize: 9, alignment: 'center' },
      { text: 'KKM', bold: true, fillColor: '#D4EDDA', fontSize: 9, alignment: 'center' },
      { text: 'Predikat', bold: true, fillColor: '#D4EDDA', fontSize: 9, alignment: 'center' },
      { text: 'Deskripsi', bold: true, fillColor: '#D4EDDA', fontSize: 9 },
    ],
    ...mapel.map((m, i) => {
      const n = m.nilaiKatrol ?? m.nilaiAkhir;
      return [
        { text: String(i + 1), fontSize: 9 },
        { text: m.mapelNama, fontSize: 9 },
        { text: n !== null ? String(n) : '—', fontSize: 9, alignment: 'center', color: n !== null && n < kkm ? 'red' : 'black' },
        { text: String(kkm), fontSize: 9, alignment: 'center' },
        { text: n !== null ? (n >= kkm ? 'Tuntas' : 'Belum Tuntas') : '—', fontSize: 9, alignment: 'center' },
        { text: m.deskripsiOverride ?? m.deskripsiAuto, fontSize: 8 },
      ];
    }),
  ];

  // Kokurikuler rows
  const kokBody: any[][] = [
    [
      { text: 'Dimensi', bold: true, fillColor: '#D4EDDA', fontSize: 9 },
      { text: 'Nilai', bold: true, fillColor: '#D4EDDA', fontSize: 9, alignment: 'center' },
      { text: 'Deskripsi', bold: true, fillColor: '#D4EDDA', fontSize: 9 },
    ],
    ...kokurikuler.map(k => [
      { text: k.namaDimensi, fontSize: 9 },
      { text: k.nilaiAkhir ?? '—', fontSize: 9, alignment: 'center' },
      { text: k.deskripsi, fontSize: 8 },
    ]),
  ];

  // Ekskul blocks
  const ekskulBlocks: Content[] = ekstrakurikuler.flatMap(e => {
    const pctStr = e.kehadiranPersen !== null ? `${e.kehadiranPersen}%` : '—';
    const items: Content[] = [
      {
        columns: [
          { text: e.nama, bold: true, fontSize: 10, width: '*' },
          { text: `Kehadiran: ${pctStr}${e.flagMerah ? ' ⚠ <70%' : ''}`, fontSize: 9, width: 'auto', color: e.flagMerah ? 'red' : 'black' },
        ],
        margin: [0, 6, 0, 2],
      } as any,
    ];
    if (e.tujuan.length > 0) {
      items.push({
        table: {
          widths: ['*', 60],
          body: [
            [{ text: 'Tujuan', bold: true, fontSize: 9, fillColor: '#EEE' }, { text: 'Nilai', bold: true, fontSize: 9, alignment: 'center', fillColor: '#EEE' }],
            ...e.tujuan.map(t => [{ text: t.deskripsi, fontSize: 8 }, { text: t.nilai ?? '—', fontSize: 9, alignment: 'center' }]),
          ],
        },
        ...ls,
        margin: [0, 0, 0, 2],
      } as any);
    }
    if (e.deskripsi) items.push({ text: e.deskripsi, fontSize: 8, italics: true, margin: [0, 0, 0, 4] } as any);
    return items;
  });

  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 55, 40, 55],
    content: [
      { text: profil.nama.toUpperCase(), bold: true, fontSize: 14, alignment: 'center' },
      { text: `${profil.alamat}${profil.kabKota ? ', ' + profil.kabKota : ''}`, fontSize: 10, alignment: 'center' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }], margin: [0, 4, 0, 4] },
      { text: 'LAPORAN HASIL BELAJAR SISWA', bold: true, fontSize: 12, alignment: 'center' },
      { text: siswa.tahunAjaran ? `Tahun Ajaran ${siswa.tahunAjaran} — Semester ${siswa.semester}` : `Semester ${siswa.semester}`, fontSize: 10, alignment: 'center' },
      { text: '', margin: [0, 6] },

      // A. Identitas
      sec('A. Identitas Siswa'),
      {
        table: {
          widths: [110, 8, '*'],
          body: [
            [{ text: 'Nama Lengkap', fontSize: 10 }, { text: ':', fontSize: 10 }, { text: siswa.nama, fontSize: 10, bold: true }],
            [{ text: 'NIS', fontSize: 10 }, { text: ':', fontSize: 10 }, { text: siswa.nis ?? '—', fontSize: 10 }],
            [{ text: 'Kelas', fontSize: 10 }, { text: ':', fontSize: 10 }, { text: siswa.kelas, fontSize: 10 }],
          ],
        },
        layout: 'noBorders',
      } as any,

      // B. Nilai Akademik
      sec('B. Nilai Akademik'),
      { table: { headerRows: 1, widths: [18, '*', 30, 30, 50, '*'], body: mapelBody }, ...ls } as any,

      // C. Kehadiran
      sec('C. Kehadiran'),
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              { text: 'Sakit (hari)', bold: true, fontSize: 10, alignment: 'center', fillColor: '#D4EDDA' },
              { text: 'Izin (hari)', bold: true, fontSize: 10, alignment: 'center', fillColor: '#D4EDDA' },
              { text: 'Tanpa Keterangan (hari)', bold: true, fontSize: 10, alignment: 'center', fillColor: '#D4EDDA' },
            ],
            [
              { text: String(kehadiran.sakit), fontSize: 12, alignment: 'center', bold: true },
              { text: String(kehadiran.izin), fontSize: 12, alignment: 'center', bold: true },
              { text: String(kehadiran.alpha), fontSize: 12, alignment: 'center', bold: true, color: kehadiran.alpha > 0 ? 'red' : 'black' },
            ],
          ],
        },
        ...ls,
        margin: [0, 0, 0, 4],
      } as any,

      // D. Kokurikuler
      sec('D. Kokurikuler (Profil Pelajar Pancasila)'),
      ...(kokurikuler.length > 0
        ? [{ table: { headerRows: 1, widths: ['*', 60, '*'], body: kokBody }, ...ls } as any]
        : [{ text: 'Belum ada penilaian kokurikuler.', fontSize: 9, italics: true } as any]
      ),

      // E. Ekskul
      sec('E. Ekstrakurikuler'),
      ...(ekstrakurikuler.length > 0 ? ekskulBlocks : [{ text: 'Tidak mengikuti ekstrakurikuler.', fontSize: 9, italics: true } as any]),

      // F. Catatan Wali
      sec('F. Catatan Wali Kelas'),
      { text: catatanWali || '(tidak ada catatan)', fontSize: 10, margin: [0, 0, 0, 16] } as any,

      // TTD
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 8] },
      {
        columns: [
          { width: '*', stack: [
            { text: 'Orang Tua / Wali,', alignment: 'center', fontSize: 10 },
            { text: '\n\n\n', fontSize: 10 },
            { text: '(___________________)', alignment: 'center', fontSize: 10 },
          ]},
          { width: '*', stack: [
            { text: 'Wali Kelas,', alignment: 'center', fontSize: 10 },
            { text: '\n\n\n', fontSize: 10 },
            { text: '(___________________)', alignment: 'center', fontSize: 10 },
          ]},
          { width: '*', stack: [
            { text: profil.kepsekJabatan ?? 'Kepala Sekolah', alignment: 'center', fontSize: 10 },
            { text: '\n\n\n', fontSize: 10 },
            { text: profil.kepsekNama, bold: true, alignment: 'center', fontSize: 10 },
            { text: `NIP. ${profil.kepsekNip}`, alignment: 'center', fontSize: 9 },
          ]},
        ],
      } as any,
    ],
  };

  const safe = siswa.nama.replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
  pdfMake.createPdf(docDef).download(`Rapor-${safe}-Smt${siswa.semester}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
