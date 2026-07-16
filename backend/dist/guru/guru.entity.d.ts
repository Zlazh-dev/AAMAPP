import { User } from '../users/user.entity';
import { Kelas } from '../kelas/kelas.entity';
export type GuruStatus = 'aktif' | 'nonaktif';
export type JenisKelamin = 'L' | 'P';
export declare class Guru {
    id: number;
    nama: string;
    nip: string | null;
    jenisKelamin: JenisKelamin;
    telepon: string | null;
    fotoUrl: string;
    status: GuruStatus;
    userId: number | null;
    user: User | null;
    createdAt: Date;
    updatedAt: Date;
    waliKelas: Kelas[];
}
