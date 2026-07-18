import { IsString, MinLength, IsInt, IsOptional, Min } from 'class-validator';

export class CreateTpDto {
  @IsString()
  @MinLength(3)
  deskripsi: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  urutan?: number;
}

export class UpdateTpDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  deskripsi?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  urutan?: number;
}
