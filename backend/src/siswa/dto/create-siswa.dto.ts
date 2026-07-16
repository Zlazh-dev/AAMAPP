import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  MaxLength,
  Matches,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { FOTO_URL_PATTERN, FOTO_URL_MESSAGE } from '../../guru/dto/create-guru.dto';

/**
 * P0 (2026-07-16): DTO ini sebelumnya HANYA mewhitelist sebagian kecil
 * field siswa (nis, nisn, nama, jenisKelamin, tanggalLahir, kelasId,
 * namaAyah, namaIbu, status) — padahal SiswaFormPage.tsx mengirim
 * JAUH lebih banyak field (tempatLahir, agama, statusDalamKeluarga,
 * anakKe, alamat, telepon, sekolahAsal, diterimaDiKelas,
 * diterimaTanggal, pekerjaanAyah, pekerjaanIbu, namaWali, alamatWali,
 * teleponWali, pekerjaanWali, fotoUrl — lihat siswa.entity.ts).
 * Karena main.ts memakai `forbidNonWhitelisted: true`, SETIAP
 * tambah/edit siswa dari UI gagal 400 "property X should not exist".
 * FIX: whitelist SEMUA kolom siswa.entity.ts yang dikirim form,
 * dengan @MaxLength mengikuti panjang kolom di entity.
 */
export class CreateSiswaDto {
  @IsString()
  @IsNotEmpty({ message: 'NIS wajib diisi' })
  @MaxLength(20)
  @Matches(/^[0-9A-Za-z\-_]+$/, {
    message: 'NIS mengandung karakter tidak valid',
  })
  nis: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9A-Za-z\-_]*$/, {
    message: 'NISN mengandung karakter tidak valid',
  })
  nisn?: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama siswa wajib diisi' })
  @MaxLength(255)
  nama: string;

  @IsIn(['L', 'P'], { message: 'jenisKelamin harus L atau P' })
  jenisKelamin: 'L' | 'P';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tempatLahir?: string | null;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'tanggalLahir harus format ISO date (YYYY-MM-DD)' },
  )
  tanggalLahir?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  agama?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  statusDalamKeluarga?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  anakKe?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  alamat?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telepon?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sekolahAsal?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  diterimaDiKelas?: string | null;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'diterimaTanggal harus format ISO date (YYYY-MM-DD)' },
  )
  diterimaTanggal?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  kelasId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  namaAyah?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pekerjaanAyah?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  namaIbu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pekerjaanIbu?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  namaWali?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  alamatWali?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  teleponWali?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pekerjaanWali?: string | null;

  @IsOptional()
  @IsIn(['aktif', 'nonaktif'])
  status?: 'aktif' | 'nonaktif';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  // SiswaFormPage selalu mengirim fotoUrl (bahkan '' saat belum ada foto).
  @ValidateIf((o) => o.fotoUrl !== undefined && o.fotoUrl !== '')
  @Matches(FOTO_URL_PATTERN, { message: FOTO_URL_MESSAGE })
  fotoUrl?: string;
}

export class UpdateSiswaDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nisn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nama?: string;

  @IsOptional()
  @IsIn(['L', 'P'])
  jenisKelamin?: 'L' | 'P';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tempatLahir?: string | null;

  @IsOptional()
  @IsDateString()
  tanggalLahir?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  agama?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  statusDalamKeluarga?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  anakKe?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  alamat?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telepon?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sekolahAsal?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  diterimaDiKelas?: string | null;

  @IsOptional()
  @IsDateString()
  diterimaTanggal?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  kelasId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  namaAyah?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pekerjaanAyah?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  namaIbu?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pekerjaanIbu?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  namaWali?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  alamatWali?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  teleponWali?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pekerjaanWali?: string | null;

  @IsOptional()
  @IsIn(['aktif', 'nonaktif'])
  status?: 'aktif' | 'nonaktif';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ValidateIf((o) => o.fotoUrl !== undefined && o.fotoUrl !== '')
  @Matches(FOTO_URL_PATTERN, { message: FOTO_URL_MESSAGE })
  fotoUrl?: string;
}
