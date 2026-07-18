import {
  IsString,
  MinLength,
  IsInt,
  IsIn,
  IsOptional,
  IsDateString,
  Min,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreatePenilaianDto {
  @IsString()
  @MinLength(2)
  nama: string;

  @IsString()
  @IsIn(['Formatif', 'Sumatif'])
  jenis: 'Formatif' | 'Sumatif';

  @IsString()
  @IsIn(['SUMATIF_TP', 'SUMATIF_AKHIR_SEMESTER', 'SUMATIF_AKHIR_TAHUN'])
  @IsOptional()
  subjenis?: 'SUMATIF_TP' | 'SUMATIF_AKHIR_SEMESTER' | 'SUMATIF_AKHIR_TAHUN';

  @IsInt()
  @Min(1)
  bobot: number;

  @IsDateString()
  tanggal: string;

  /** Hanya untuk SUMATIF_TP */
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  tpIds?: number[];
}

export class UpdatePenilaianDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  nama?: string;

  @IsString()
  @IsIn(['Formatif', 'Sumatif'])
  @IsOptional()
  jenis?: 'Formatif' | 'Sumatif';

  @IsString()
  @IsIn(['SUMATIF_TP', 'SUMATIF_AKHIR_SEMESTER', 'SUMATIF_AKHIR_TAHUN'])
  @IsOptional()
  subjenis?: 'SUMATIF_TP' | 'SUMATIF_AKHIR_SEMESTER' | 'SUMATIF_AKHIR_TAHUN';

  @IsInt()
  @Min(1)
  @IsOptional()
  bobot?: number;

  @IsDateString()
  @IsOptional()
  tanggal?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  tpIds?: number[];
}
