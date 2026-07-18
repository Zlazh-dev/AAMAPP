import { IsString, IsInt, IsIn, IsOptional, MinLength, Min, Max, IsDateString } from 'class-validator';

export class CatatPelanggaranDto {
  @IsInt()
  siswaId: number;

  /** ID butir katalog — wajib kecuali KHUSUS */
  @IsOptional()
  @IsInt()
  katalogId?: number;

  /** Untuk KHUSUS: override kategori */
  @IsOptional()
  @IsIn(['R', 'S', 'B', 'SB', 'KHUSUS'])
  kategori?: 'R' | 'S' | 'B' | 'SB' | 'KHUSUS';

  /** Untuk KHUSUS: override poin (0 untuk KHUSUS) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  poin?: number;

  @IsDateString()
  tanggal: string;

  @IsOptional()
  @IsString()
  catatan?: string;

  @IsOptional()
  @IsString()
  buktiUrl?: string;
}
