import { IsArray, IsInt, Min, Max, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class NilaiEntriDto {
  @IsInt()
  siswaId: number;

  @IsInt()
  @Min(0)
  @Max(100)
  nilai: number;

  @IsString()
  @IsOptional()
  catatan?: string;
}

export class UpsertNilaiDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NilaiEntriDto)
  entri: NilaiEntriDto[];
}
