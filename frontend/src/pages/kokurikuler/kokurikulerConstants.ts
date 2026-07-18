/**
 * 8 Dimensi kokurikuler (master, verbatim referensi radig F6c).
 */
export const DIMENSI_LIST = [
  'Beriman dan Bertakwa',
  'Berkebinekaan Global',
  'Gotong Royong',
  'Penalaran Kritis',
  'Kreativitas',
  'Kemandirian',
  'Kesehatan',
  'Komunikasi',
] as const;

export type NamaDimensi = typeof DIMENSI_LIST[number];
export type NilaiKokurikuler = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';

export const NILAI_OPTIONS: NilaiKokurikuler[] = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'];

export function nilaiToVariant(n: NilaiKokurikuler | null | undefined): 'green' | 'blue' | 'yellow' | 'red' | 'gray' {
  switch (n) {
    case 'Sangat Baik': return 'green';
    case 'Baik': return 'blue';
    case 'Cukup': return 'yellow';
    case 'Kurang': return 'red';
    default: return 'gray';
  }
}
