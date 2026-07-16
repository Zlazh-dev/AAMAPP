import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateMapelDto {
  @IsString()
  @MaxLength(100)
  nama: string;

  @IsString()
  @MaxLength(20)
  kode: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  kelompok?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  urutan?: number;
}
