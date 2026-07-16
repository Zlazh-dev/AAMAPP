import { Repository } from 'typeorm';
import { Kelas } from './kelas.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
export interface KelasFilter {
    q?: string;
    tingkat?: number;
    page?: number;
    limit?: number;
}
export declare class KelasService {
    private readonly repo;
    private readonly siswaRepo;
    private readonly guruRepo;
    private readonly penugasanRepo;
    private readonly audit;
    constructor(repo: Repository<Kelas>, siswaRepo: Repository<Siswa>, guruRepo: Repository<Guru>, penugasanRepo: Repository<Penugasan>, audit: AuditService);
    list(filter: KelasFilter): Promise<{
        data: Kelas[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<Kelas>;
    create(payload: Partial<Kelas>, req: Request): Promise<Kelas>;
    update(id: number, payload: Partial<Kelas>, req: Request): Promise<Kelas>;
    setWali(id: number, payload: {
        waliGuruId?: number | null;
        force?: boolean;
    }, req: Request): Promise<Kelas>;
    remove(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
}
