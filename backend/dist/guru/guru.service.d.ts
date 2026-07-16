import { Repository } from 'typeorm';
import { Guru, GuruStatus } from './guru.entity';
import { Kelas } from '../kelas/kelas.entity';
import { AuditService } from '../audit/audit.service';
import { KurikulumService } from '../kurikulum/kurikulum.service';
import { TahunAjaranService } from '../tahun-ajaran/tahun-ajaran.service';
import { Request } from 'express';
export interface GuruFilter {
    q?: string;
    status?: GuruStatus;
    page?: number;
    limit?: number;
}
export declare class GuruService {
    private readonly repo;
    private readonly kelasRepo;
    private readonly audit;
    private readonly kurikulum;
    private readonly ta;
    constructor(repo: Repository<Guru>, kelasRepo: Repository<Kelas>, audit: AuditService, kurikulum: KurikulumService, ta: TahunAjaranService);
    list(filter: GuruFilter): Promise<{
        data: {
            id: number;
            nama: string;
            nip: string | null;
            jenisKelamin: import("./guru.entity").JenisKelamin;
            telepon: string | null;
            fotoUrl: string;
            status: GuruStatus;
            userId: number | null;
            punyaAkun: boolean;
            jumlahPaket: number;
            waliKelas: Kelas[];
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<{
        punyaAkun: boolean;
        jumlahPaket: number;
        id: number;
        nama: string;
        nip: string | null;
        jenisKelamin: import("./guru.entity").JenisKelamin;
        telepon: string | null;
        fotoUrl: string;
        status: GuruStatus;
        userId: number | null;
        user: import("../users/user.entity").User | null;
        createdAt: Date;
        updatedAt: Date;
        waliKelas: Kelas[];
    }>;
    create(payload: Partial<Guru>, req: Request): Promise<Guru>;
    update(id: number, payload: Partial<Guru>, req: Request): Promise<Guru>;
    remove(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
}
