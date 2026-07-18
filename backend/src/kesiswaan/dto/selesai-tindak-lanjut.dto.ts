import { IsString, MinLength } from 'class-validator';

export class SelesaiTindakLanjutDto {
  @IsString()
  @MinLength(3)
  catatanPelaksanaan: string;
}
