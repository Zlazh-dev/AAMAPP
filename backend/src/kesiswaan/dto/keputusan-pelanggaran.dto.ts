import { IsString, IsOptional, MinLength } from 'class-validator';

export class KeputusanPelanggaranDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  alasan?: string;
}
