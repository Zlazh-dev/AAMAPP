import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateKelasDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama kelas wajib diisi' })
  @MaxLength(50)
  nama: string;

  @IsInt()
  @Min(7)
  tingkat: number; // 7 | 8 | 9

  @IsOptional()
  @IsIn(['D', 'E', 'F'])
  fase?: 'D' | 'E' | 'F';

  @IsOptional()
  @IsInt()
  waliGuruId?: number | null;
}

export class UpdateKelasDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nama?: string;

  @IsOptional()
  @IsInt()
  @Min(7)
  tingkat?: number;

  @IsOptional()
  @IsIn(['D', 'E', 'F'])
  fase?: 'D' | 'E' | 'F';

  @IsOptional()
  @IsInt()
  waliGuruId?: number | null;
}

export class SetWaliDto {
  @IsOptional()
  @IsInt({ message: 'waliGuruId harus integer atau null' })
  waliGuruId?: number | null;

  @IsOptional()
  force?: boolean;
}
