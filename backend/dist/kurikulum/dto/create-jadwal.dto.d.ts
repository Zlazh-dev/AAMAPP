export declare class CreateJadwalDto {
    penugasanId: number;
    hari: number;
    jamMulai: string;
    jamSelesai: string;
    sesiKe?: number;
    jenis?: 'normal' | 'pengganti';
}
