import { IsInt, Max, Min } from 'class-validator';

/**
 * T12-FIX: KKM global mapel.
 * Struktur nilai disimpan sebagai `{ nilai: number }` di key 'kkm'
 * (sesuai §14.10.2 spec — TANPA mapelId/keterangan/perMapel).
 */
export class UpdateKkmDto {
  @IsInt()
  @Min(0)
  @Max(100)
  nilai: number;
}
