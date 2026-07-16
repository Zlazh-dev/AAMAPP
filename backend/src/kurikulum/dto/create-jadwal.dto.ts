import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * T12: Buat slot jadwal KBM.
 * Validasi overlap dilakukan di service (interval time).
 * Hari: 1=Senin..7=Minggu (mapping ISO).
 * JamMulai/JamSelesai: 'HH:mm' (24 jam, Asia/Jakarta).
 */
export class CreateJadwalDto {
  @IsInt()
  @Min(1)
  penugasanId: number;

  @IsInt()
  @Min(1)
  @Max(6)
  hari: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'jamMulai harus HH:mm (24 jam)',
  })
  jamMulai: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'jamSelesai harus HH:mm (24 jam)',
  })
  jamSelesai: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  sesiKe?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsIn(['normal', 'pengganti'])
  jenis?: 'normal' | 'pengganti' = 'normal';
}
