export declare class CreateSiswaDto {
    nis: string;
    nisn?: string;
    nama: string;
    jenisKelamin: 'L' | 'P';
    tanggalLahir?: string;
    kelasId?: number | null;
    namaAyah?: string;
    namaIbu?: string;
    status?: 'aktif' | 'nonaktif';
}
export declare class UpdateSiswaDto {
    nis?: string;
    nisn?: string | null;
    nama?: string;
    jenisKelamin?: 'L' | 'P';
    tanggalLahir?: string;
    kelasId?: number | null;
    namaAyah?: string | null;
    namaIbu?: string | null;
    status?: 'aktif' | 'nonaktif';
}
