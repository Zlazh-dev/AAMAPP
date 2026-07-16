import { Repository } from 'typeorm';
import { Pengaturan } from './pengaturan.entity';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
export type PengaturanKey = 'profil_sekolah' | 'jam_presensi' | 'lokasi' | 'kkm';
export declare class PengaturanService {
    private readonly repo;
    private readonly audit;
    constructor(repo: Repository<Pengaturan>, audit: AuditService);
    listAll(): Promise<Pengaturan[]>;
    getOne(key: string): Promise<Pengaturan>;
    upsert(key: string, value: any, req: Request): Promise<Pengaturan>;
    seedDefaults(): Promise<void>;
}
