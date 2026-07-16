import { Request } from 'express';
import { KurikulumService, MapelFilter } from './kurikulum.service';
import { CreateMapelDto } from './dto/create-mapel.dto';
import { UpdateMapelDto } from './dto/update-mapel.dto';
import { CreatePenugasanDto } from './dto/create-penugasan.dto';
import { UpdatePenugasanDto } from './dto/update-penugasan.dto';
import { CreateJadwalDto } from './dto/create-jadwal.dto';
import { UpdateJadwalDto } from './dto/update-jadwal.dto';
import { UpdateKkmDto } from './dto/update-kkm.dto';
export declare class KurikulumController {
    private readonly svc;
    constructor(svc: KurikulumService);
    listMapel(q: MapelFilter): Promise<{
        data: import("./mapel.entity").Mapel[];
        total: number;
        page: number;
        limit: number;
    }>;
    oneMapel(id: number): Promise<import("./mapel.entity").Mapel>;
    createMapel(body: CreateMapelDto, req: Request): Promise<import("./mapel.entity").Mapel>;
    updateMapel(id: number, body: UpdateMapelDto, req: Request): Promise<import("./mapel.entity").Mapel>;
    removeMapel(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
    listPenugasan(taId?: string, guruId?: string, kelasId?: string, mapelId?: string): Promise<{
        data: import("./penugasan.entity").Penugasan[];
        taId: number;
    }>;
    createPenugasan(body: CreatePenugasanDto, req: Request): Promise<import("./penugasan.entity").Penugasan[]>;
    updatePenugasan(id: number, body: UpdatePenugasanDto, req: Request): Promise<import("./penugasan.entity").Penugasan | null>;
    removePenugasan(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
    listJadwal(taId?: string, kelasId?: string, guruId?: string): Promise<{
        data: import("./jadwal-kbm.entity").JadwalKbm[];
        taId: number;
    }>;
    createJadwal(body: CreateJadwalDto, req: Request): Promise<import("./jadwal-kbm.entity").JadwalKbm>;
    updateJadwal(id: number, body: UpdateJadwalDto, req: Request): Promise<import("./jadwal-kbm.entity").JadwalKbm>;
    removeJadwal(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
    getKkm(): Promise<import("../pengaturan/pengaturan.entity").Pengaturan>;
    updateKkm(body: UpdateKkmDto, req: Request): Promise<import("../pengaturan/pengaturan.entity").Pengaturan>;
}
