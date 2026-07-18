import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * F4a — Body PATCH .../setujui atau PATCH .../tolak.
 * Untuk setujui: alasan OPSIONAL.
 * Untuk tolak: alasan WAJIB — divalidasi di service.
 */
export class KeputusanDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  alasan?: string;
}
