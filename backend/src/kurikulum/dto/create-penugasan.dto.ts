import {
  ArrayMinSize,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

/**
 * T12: Buat penugasan paket (guru mengajar mapel X di kelas Y).
 * Bentuk body: 1 guru + 1 mapel + 1+ kelas → 1 penugasan PER kelas.
 * Lingkup selalu TA aktif (server resolves).
 */
export class CreatePenugasanDto {
  @IsInt()
  @Min(1)
  guruId: number;

  @IsInt()
  @Min(1)
  mapelId: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  kelasIds: number[];
}
