import { Repository } from 'typeorm';
import { Guru } from '../guru/guru.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
export type ImportJenis = 'guru' | 'siswa';
export interface ImportCellError {
    baris: number;
    kolom: string;
    pesan: string;
}
export interface ImportPreviewResult {
    valid: number;
    errors: ImportCellError[];
}
export interface ImportCommitResult {
    tersimpan: number;
    dilewati: number;
}
export declare class ImportService {
    private readonly guruRepo;
    private readonly siswaRepo;
    private readonly kelasRepo;
    private readonly audit;
    constructor(guruRepo: Repository<Guru>, siswaRepo: Repository<Siswa>, kelasRepo: Repository<Kelas>, audit: AuditService);
    generateTemplate(jenis: ImportJenis): Promise<Buffer>;
    preview(jenis: ImportJenis, buffer: Buffer): Promise<ImportPreviewResult>;
    commit(jenis: ImportJenis, buffer: Buffer, req: Request): Promise<ImportCommitResult>;
    private isValidDateString;
    private parseDateString;
}
