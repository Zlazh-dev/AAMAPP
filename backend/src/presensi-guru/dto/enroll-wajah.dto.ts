import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  ValidateNested,
  ArrayNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class EmbeddingVectorDto {
  @IsArray()
  @IsNumber({}, { each: true })
  vec: number[];
}

/**
 * F3a — Enrollment wajah: 3–5 pose.
 * Body: { embeddings: number[][], snapshotBase64?: string }  (array of embedding vectors + JPEG snapshot opsional).
 */
export class EnrollWajahDto {
  /** Array of embedding vectors, 3–5 pose. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(3, { message: 'Minimal 3 pose wajah untuk enrollment' })
  @ArrayMaxSize(5, { message: 'Maksimal 5 pose wajah untuk enrollment' })
  embeddings: number[][];

  /**
   * F3b — snapshot frame pose Depan (base64 JPEG, ~320px, q0.7).
   * Opsional (enroll lama tidak mengirim). Backend validasi magic bytes JPEG.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500_000) // ~370KB base64 untuk JPEG 320px — batas aman
  snapshotBase64?: string;
}

