export declare class CreateGuruDto {
    nama: string;
    nip?: string;
    jenisKelamin: 'L' | 'P';
    telepon?: string;
    fotoUrl?: string;
    status?: 'aktif' | 'nonaktif';
    userId?: number;
}
export declare class UpdateGuruDto {
    nama?: string;
    nip?: string;
    jenisKelamin?: 'L' | 'P';
    telepon?: string;
    fotoUrl?: string;
    status?: 'aktif' | 'nonaktif';
    userId?: number | null;
}
