import {
  IsString, IsInt, IsIn, IsOptional, Min, Max, MinLength, IsArray,
  ArrayMinSize, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NilaiEkskul } from '../ekskul-nilai.entity';

const NILAI_EKSKUL: NilaiEkskul[] = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'];

export class CreateEkskulDto {
  @IsString() @MinLength(2)
  nama: string;

  @IsInt() @IsOptional()
  pembinaGuruId?: number;
}

export class UpdateEkskulDto {
  @IsString() @MinLength(2) @IsOptional()
  nama?: string;

  @IsInt() @IsOptional()
  pembinaGuruId?: number | null;
}

export class AddPesertaDto {
  @IsInt() @Min(1)
  siswaId: number;
}

export class CreateTujuanDto {
  @IsInt() @Min(1) @Max(2)
  semester: number;

  @IsString() @MinLength(3)
  deskripsi: string;
}

export class UpdateTujuanDto {
  @IsString() @MinLength(3) @IsOptional()
  deskripsi?: string;
}

export class NilaiEntriDto {
  @IsInt() @Min(1)
  pesertaId: number;

  @IsInt() @Min(1)
  tujuanId: number;

  @IsString() @IsIn(NILAI_EKSKUL)
  nilai: NilaiEkskul;
}

export class UpsertNilaiDto {
  @IsInt() @Min(1) @Max(2)
  semester: number;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => NilaiEntriDto)
  entri: NilaiEntriDto[];
}

export class KehadiranEntriDto {
  @IsInt() @Min(1)
  pesertaId: number;

  @IsInt() @Min(0)
  jumlahHadir: number;

  @IsInt() @Min(0)
  totalPertemuan: number;
}

export class UpsertKehadiranDto {
  @IsInt() @Min(1) @Max(2)
  semester: number;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => KehadiranEntriDto)
  entri: KehadiranEntriDto[];
}
