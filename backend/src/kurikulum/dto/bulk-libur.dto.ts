import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * T15-FIX: Kalender libur seleksi-multi lalu aksi (KEPUTUSAN USER rev.2).
 * POST /api/admin/libur/bulk
 * aksi='tandai' → buat entri libur untuk setiap tanggal yang belum ada.
 * aksi='hapus'  → hapus entri libur untuk setiap tanggal yang ada.
 * Maks 62 tanggal per panggilan (± 2 bulan kalender).
 */
export class BulkLiburDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(62)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true, message: 'tanggal YYYY-MM-DD' })
  tanggal: string[];

  @IsOptional()
  @IsString()
  @MaxLength(150)
  keterangan?: string;

  @IsIn(['tandai', 'hapus'])
  aksi: 'tandai' | 'hapus';
}
