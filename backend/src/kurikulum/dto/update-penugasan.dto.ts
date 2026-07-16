import { IsInt, Min } from 'class-validator';

/**
 * T12: PATCH penugasan — ganti guru pengampu (id paket TETAP).
 * Aturan turunan §9: relasi (jadwal, TP, penilaian, nilai) TIDAK tersentuh.
 */
export class UpdatePenugasanDto {
  @IsInt()
  @Min(1)
  guruId: number;
}
