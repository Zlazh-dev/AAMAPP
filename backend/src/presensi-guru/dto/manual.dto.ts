import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * F3a — Input manual presensi guru oleh admin.
 * Body: { guruId, tanggal, status, checkInAt?, checkOutAt?, alasan }
 * alasan WAJIB per F3-SPEC.
 */
export class ManualDto {
  @IsInt()
  guruId: number;

  @IsDateString({}, { message: 'tanggal harus format YYYY-MM-DD' })
  tanggal: string;

  @IsIn(['HADIR', 'TERLAMBAT', 'ALPHA'], {
    message: "status harus 'HADIR', 'TERLAMBAT', atau 'ALPHA'",
  })
  status: 'HADIR' | 'TERLAMBAT' | 'ALPHA';

  /** Waktu check-in (ISO 8601 / timestamptz). */
  @IsOptional()
  @IsString()
  checkInAt?: string;

  /** Waktu check-out (ISO 8601 / timestamptz). */
  @IsOptional()
  @IsString()
  checkOutAt?: string;

  /** Alasan wajib untuk record manual. */
  @IsNotEmpty({ message: 'alasan wajib diisi untuk input manual' })
  @IsString()
  alasan: string;
}
