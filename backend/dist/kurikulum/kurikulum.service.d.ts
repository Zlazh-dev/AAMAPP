import { Repository } from 'typeorm';
import { Mapel } from './mapel.entity';
import { Penugasan } from './penugasan.entity';
import { JadwalKbm } from './jadwal-kbm.entity';
import { KalenderLibur } from './kalender-libur.entity';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
import { TahunAjaranService } from '../tahun-ajaran/tahun-ajaran.service';
import { PengaturanService } from '../pengaturan/pengaturan.service';
import { CreatePenugasanDto } from './dto/create-penugasan.dto';
import { UpdatePenugasanDto } from './dto/update-penugasan.dto';
import { CreateJadwalDto } from './dto/create-jadwal.dto';
import { UpdateJadwalDto } from './dto/update-jadwal.dto';
import { CreateLiburDto } from './dto/create-libur.dto';
import { UpdateKkmDto } from './dto/update-kkm.dto';
import { Guru } from '../guru/guru.entity';
import { Kelas } from '../kelas/kelas.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
export interface MapelFilter {
    q?: string;
    page?: number;
    limit?: number;
}
export declare class KurikulumService {
    private readonly mapelRepo;
    private readonly penugasanRepo;
    private readonly jadwalRepo;
    private readonly liburRepo;
    private readonly guruRepo;
    private readonly kelasRepo;
    private readonly taRepo;
    private readonly audit;
    private readonly taService;
    private readonly pengaturanService;
    constructor(mapelRepo: Repository<Mapel>, penugasanRepo: Repository<Penugasan>, jadwalRepo: Repository<JadwalKbm>, liburRepo: Repository<KalenderLibur>, guruRepo: Repository<Guru>, kelasRepo: Repository<Kelas>, taRepo: Repository<TahunAjaran>, audit: AuditService, taService: TahunAjaranService, pengaturanService: PengaturanService);
    listMapel(filter: MapelFilter): Promise<{
        data: Mapel[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOneMapel(id: number): Promise<Mapel>;
    createMapel(payload: Partial<Mapel>, req: Request): Promise<Mapel>;
    updateMapel(id: number, payload: Partial<Mapel>, req: Request): Promise<Mapel>;
    removeMapel(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
    listPenugasan(filter: {
        taId?: number;
        guruId?: number;
        kelasId?: number;
        mapelId?: number;
    }): Promise<{
        data: Penugasan[];
        taId: number;
    }>;
    private getRefNames;
    createPenugasan(dto: CreatePenugasanDto, req: Request): Promise<Penugasan[]>;
    updatePenugasan(id: number, dto: UpdatePenugasanDto, req: Request): Promise<Penugasan | null>;
    removePenugasan(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
    countPenugasanGuruAktif(guruId: number, taId: number): Promise<number>;
    listJadwal(filter: {
        taId?: number;
        kelasId?: number;
        guruId?: number;
    }): Promise<{
        data: JadwalKbm[];
        taId: number;
    }>;
    private hariLabel;
    createJadwal(dto: CreateJadwalDto, req: Request): Promise<JadwalKbm>;
    updateJadwal(id: number, dto: UpdateJadwalDto, req: Request): Promise<JadwalKbm>;
    removeJadwal(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
    private assertNoOverlap;
    listLibur(): Promise<KalenderLibur[]>;
    createLibur(dto: CreateLiburDto, req: Request): Promise<KalenderLibur>;
    removeLibur(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
    getKkm(): Promise<import("../pengaturan/pengaturan.entity").Pengaturan>;
    updateKkm(dto: UpdateKkmDto, req: Request): Promise<import("../pengaturan/pengaturan.entity").Pengaturan>;
    private getActiveTaIdOrThrow;
}
