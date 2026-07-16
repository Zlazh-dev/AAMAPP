export declare class CreateKelasDto {
    nama: string;
    tingkat: number;
    fase?: 'D' | 'E' | 'F';
    waliGuruId?: number | null;
}
export declare class UpdateKelasDto {
    nama?: string;
    tingkat?: number;
    fase?: 'D' | 'E' | 'F';
    waliGuruId?: number | null;
}
export declare class SetWaliDto {
    waliGuruId?: number | null;
    force?: boolean;
}
