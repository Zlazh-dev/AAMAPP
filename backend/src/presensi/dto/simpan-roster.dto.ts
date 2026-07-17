import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const STATUS_PRESENSI = ['H', 'S', 'I', 'A', 'T'] as const;

export class EntriPresensiDto {
  @IsInt()
  siswaId: number;

  @IsIn(STATUS_PRESENSI, {
    message: 'status harus salah satu dari H, S, I, A, T',
  })
  status: 'H' | 'S' | 'I' | 'A' | 'T';
}

export class SimpanRosterDto {
  @IsDateString({}, { message: 'tanggal harus format YYYY-MM-DD' })
  tanggal: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntriPresensiDto)
  entri: EntriPresensiDto[];

  /** Wajib bila admin mengoreksi sesudah cutoff (dicatat di audit). */
  @IsOptional()
  @IsString()
  alasan?: string;
}
