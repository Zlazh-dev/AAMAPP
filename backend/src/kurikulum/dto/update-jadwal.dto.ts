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
 * T12: Patch jadwal KBM — biasanya perpindahan sesi / koreksi waktu.
 */
export class UpdateJadwalDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  penugasanId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  hari?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'jamMulai harus HH:mm (24 jam)',
  })
  jamMulai?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'jamSelesai harus HH:mm (24 jam)',
  })
  jamSelesai?: string;

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
  jenis?: 'normal' | 'pengganti';
}
