import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

/** Pattern "YYYY/YYYY" — contoh 2025/2026. */
const TAHUN_AJARAN_REGEX = /^\d{4}\/\d{4}$/;

export class CreateTahunAjaranDto {
  @IsString()
  @Length(9, 9, { message: 'nama harus berformat YYYY/YYYY' })
  @Matches(TAHUN_AJARAN_REGEX, {
    message: 'nama harus berformat YYYY/YYYY (contoh 2025/2026)',
  })
  nama: string;

  @IsIn([1, 2], { message: 'semester harus 1 (Ganjil) atau 2 (Genap)' })
  semester: 1 | 2;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;
}

export class UpdateTahunAjaranDto {
  @IsOptional()
  @IsString()
  @Length(9, 9)
  @Matches(TAHUN_AJARAN_REGEX)
  nama?: string;

  @IsOptional()
  @IsIn([1, 2])
  semester?: 1 | 2;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;
}
