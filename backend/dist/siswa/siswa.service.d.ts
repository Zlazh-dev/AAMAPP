import { Repository } from 'typeorm';
import { Siswa } from './siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
export interface SiswaFilter {
    q?: string;
    kelasId?: number;
    status?: 'aktif' | 'nonaktif';
    jenisKelamin?: 'L' | 'P';
    page?: number;
    limit?: number;
}
export declare class SiswaService {
    private readonly repo;
    private readonly kelasRepo;
    private readonly audit;
    constructor(repo: Repository<Siswa>, kelasRepo: Repository<Kelas>, audit: AuditService);
    list(filter: SiswaFilter): Promise<{
        data: Siswa[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<Siswa>;
    create(payload: any, req: Request): Promise<Siswa>;
    update(id: number, payload: any, req: Request): Promise<Siswa>;
    remove(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
    private assertNoDuplicateSiswa;
    private duplicateSiswaError;
    private normalizePayload;
}
