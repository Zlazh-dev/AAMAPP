import { Guru } from '../guru/guru.entity';
export type KelasFase = 'D' | 'E' | 'F';
export declare class Kelas {
    id: number;
    nama: string;
    tingkat: number;
    fase: KelasFase;
    waliGuruId: number | null;
    waliGuru: Guru | null;
    createdAt: Date;
    updatedAt: Date;
}
