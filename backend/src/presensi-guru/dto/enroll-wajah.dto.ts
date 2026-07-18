import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class EmbeddingVectorDto {
  @IsArray()
  @IsNumber({}, { each: true })
  vec: number[];
}

/**
 * F3a — Enrollment wajah: 3–5 pose.
 * Body: { embeddings: number[][] }  (array of embedding vectors).
 */
export class EnrollWajahDto {
  /** Array of embedding vectors, 3–5 pose. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(3, { message: 'Minimal 3 pose wajah untuk enrollment' })
  @ArrayMaxSize(5, { message: 'Maksimal 5 pose wajah untuk enrollment' })
  embeddings: number[][];
}
