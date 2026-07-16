import { Penugasan } from './penugasan.entity';
export declare class JadwalKbm {
    id: number;
    penugasan: Penugasan;
    penugasanId: number;
    hari: number;
    jamMulai: string;
    jamSelesai: string;
    sesiKe: number | null;
    createdAt: Date;
    updatedAt: Date;
}
