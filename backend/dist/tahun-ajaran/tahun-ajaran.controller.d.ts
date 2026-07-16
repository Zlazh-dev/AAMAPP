import { Request } from 'express';
import { TahunAjaranService } from './tahun-ajaran.service';
import { CreateTahunAjaranDto, UpdateTahunAjaranDto } from './dto/create-tahun-ajaran.dto';
export declare class TahunAjaranController {
    private readonly svc;
    constructor(svc: TahunAjaranService);
    getActive(): Promise<{
        tahunAjaran: import("./tahun-ajaran.entity").TahunAjaran | null;
    }>;
    listTa(): Promise<import("./tahun-ajaran.entity").TahunAjaran[]>;
    oneTa(id: number): Promise<import("./tahun-ajaran.entity").TahunAjaran>;
    createTa(body: CreateTahunAjaranDto, req: Request): Promise<import("./tahun-ajaran.entity").TahunAjaran>;
    updateTa(id: number, body: UpdateTahunAjaranDto, req: Request): Promise<import("./tahun-ajaran.entity").TahunAjaran>;
    activateTa(id: number, req: Request): Promise<import("./tahun-ajaran.entity").TahunAjaran>;
    removeTa(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
}
