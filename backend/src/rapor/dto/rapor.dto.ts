import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class OverrideMapelDto {
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  nilaiKatrol?: number;

  @IsString()
  @IsOptional()
  deskripsiOverride?: string;
}

export class CatatanWaliDto {
  @IsString()
  catatanWali: string;
}
