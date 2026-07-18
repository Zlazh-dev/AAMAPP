import {
  IsString,
  IsInt,
  IsIn,
  IsOptional,
  Min,
  Max,
  MinLength,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DIMENSI_LULUSAN } from '../kokurikuler-target.entity';
import { NilaiKualitatif } from '../kokurikuler-asesmen.entity';

const NILAI_KUALITATIF: NilaiKualitatif[] = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'];

export class CreateKegiatanDto {
  @IsInt()
  @IsOptional()
  tahunAjaranId?: number;

  @IsInt()
  @Min(1)
  @Max(2)
  semester: number;

  @IsString()
  @MinLength(3)
  tema: string;
}

export class UpdateKegiatanDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  tema?: string;

  @IsInt()
  @Min(1)
  @Max(2)
  @IsOptional()
  semester?: number;
}

export class AddTargetDto {
  @IsString()
  @IsIn(DIMENSI_LULUSAN as unknown as string[])
  namaDimensi: string;
}

export class AddTimDto {
  @IsInt()
  @Min(1)
  kelasId: number;

  @IsInt()
  @Min(1)
  guruId: number;
}

export class AsesmenEntriDto {
  @IsInt()
  @Min(1)
  siswaId: number;

  @IsInt()
  @Min(1)
  targetId: number;

  @IsString()
  @IsIn(NILAI_KUALITATIF)
  nilai: NilaiKualitatif;
}

export class UpsertAsesmenDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AsesmenEntriDto)
  entri: AsesmenEntriDto[];
}
