import {
  IsArray,
  IsNumber,
  IsOptional,
  IsIn,
} from 'class-validator';

/**
 * F3a — Scan presensi mandiri 1:1.
 * Body: { embedding, lat?, lng?, mode? }
 */
export class ScanDto {
  /** Embedding vektor wajah dari kamera browser (single vector). */
  @IsArray()
  @IsNumber({}, { each: true })
  embedding: number[];

  /** Latitude GPS (WGS84). Wajib jika lokasi.aktif=true. */
  @IsOptional()
  @IsNumber()
  lat?: number;

  /** Longitude GPS (WGS84). Wajib jika lokasi.aktif=true. */
  @IsOptional()
  @IsNumber()
  lng?: number;

  /** Mode scan: masuk (check-in) atau pulang (check-out). Default: masuk. */
  @IsOptional()
  @IsIn(['masuk', 'pulang'], { message: "mode harus 'masuk' atau 'pulang'" })
  mode?: 'masuk' | 'pulang';
}
