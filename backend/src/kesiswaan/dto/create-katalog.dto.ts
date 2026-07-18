import { IsString, IsInt, IsIn, MinLength, Min, Max } from 'class-validator';

export class CreateKatalogDto {
  @IsString()
  @MinLength(3)
  bentuk: string;

  @IsString()
  @IsIn(['R', 'S', 'B', 'SB'])
  kategori: 'R' | 'S' | 'B' | 'SB';

  @IsInt()
  @Min(1)
  @Max(500)
  poin: number;
}
