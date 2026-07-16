import { Request } from 'express';
import { GuruService, GuruFilter } from './guru.service';
import { CreateGuruDto, UpdateGuruDto } from './dto/create-guru.dto';
export declare class GuruController {
    private readonly svc;
    constructor(svc: GuruService);
    list(q: GuruFilter): Promise<{
        data: {
            id: number;
            nama: string;
            nip: string | null;
            jenisKelamin: import("./guru.entity").JenisKelamin;
            telepon: string | null;
            fotoUrl: string;
            status: import("./guru.entity").GuruStatus;
            userId: number | null;
            punyaAkun: boolean;
            jumlahPaket: number;
            waliKelas: import("../kelas/kelas.entity").Kelas[];
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    one(id: number): Promise<{
        punyaAkun: boolean;
        jumlahPaket: number;
        id: number;
        nama: string;
        nip: string | null;
        jenisKelamin: import("./guru.entity").JenisKelamin;
        telepon: string | null;
        fotoUrl: string;
        status: import("./guru.entity").GuruStatus;
        userId: number | null;
        user: import("../users/user.entity").User | null;
        createdAt: Date;
        updatedAt: Date;
        waliKelas: import("../kelas/kelas.entity").Kelas[];
    }>;
    create(body: CreateGuruDto, req: Request): Promise<import("./guru.entity").Guru>;
    update(id: number, body: UpdateGuruDto, req: Request): Promise<import("./guru.entity").Guru>;
    remove(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
}
