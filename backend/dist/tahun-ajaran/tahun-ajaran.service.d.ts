import { Repository } from 'typeorm';
import { TahunAjaran } from './tahun-ajaran.entity';
import { CreateTahunAjaranDto, UpdateTahunAjaranDto } from './dto/create-tahun-ajaran.dto';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
export declare class TahunAjaranService {
    private readonly taRepo;
    private readonly audit;
    constructor(taRepo: Repository<TahunAjaran>, audit: AuditService);
    listTa(): Promise<TahunAjaran[]>;
    findOneTa(id: number): Promise<TahunAjaran>;
    createTa(payload: CreateTahunAjaranDto, req: Request): Promise<TahunAjaran>;
    updateTa(id: number, payload: UpdateTahunAjaranDto, req: Request): Promise<TahunAjaran>;
    removeTa(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
    aktifkan(id: number, req: Request): Promise<TahunAjaran>;
    getActive(): Promise<{
        tahunAjaran: TahunAjaran | null;
    }>;
}
