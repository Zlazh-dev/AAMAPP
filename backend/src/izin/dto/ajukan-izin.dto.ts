import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { JenisIzin } from '../izin-guru.entity';

@ValidatorConstraint({ name: 'selesaiGteMultai', async: false })
class SelesaiGteMulaiConstraint implements ValidatorConstraintInterface {
  validate(selesai: string, args: ValidationArguments): boolean {
    const obj = args.object as AjukanIzinDto;
    if (!obj.mulaiTanggal || !selesai) return true; // biarkan IsDateString tangani
    return selesai >= obj.mulaiTanggal;
  }
  defaultMessage(): string {
    return 'selesaiTanggal harus ≥ mulaiTanggal';
  }
}

/**
 * F4a — Body POST /api/izin/guru (guru mengajukan).
 * guruId TIDAK ada di body — diambil dari sesi server.
 */
export class AjukanIzinDto {
  @IsIn(['IZIN', 'SAKIT', 'DINAS'], { message: 'jenis harus IZIN, SAKIT, atau DINAS' })
  jenis: JenisIzin;

  @IsDateString({}, { message: 'mulaiTanggal harus format YYYY-MM-DD' })
  mulaiTanggal: string;

  @IsDateString({}, { message: 'selesaiTanggal harus format YYYY-MM-DD' })
  @Validate(SelesaiGteMulaiConstraint)
  selesaiTanggal: string;

  @IsNotEmpty({ message: 'keterangan wajib diisi' })
  @IsString()
  @MaxLength(2000)
  keterangan: string;

  @IsOptional()
  @IsUrl({}, { message: 'lampiranUrl harus berupa URL valid' })
  @MaxLength(500)
  lampiranUrl?: string;
}
