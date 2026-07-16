import { Type } from 'class-transformer';
import { Matches, MaxLength } from 'class-validator';

/**
 * T12: Tambah hari libur.
 * tanggal: YYYY-MM-DD (Asia/Jakarta).
 */
export class CreateLiburDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'tanggal YYYY-MM-DD' })
  tanggal: string;

  @MaxLength(150)
  keterangan: string;
}
