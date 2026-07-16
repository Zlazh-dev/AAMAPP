import { Request } from 'express';
import { KelasService, KelasFilter } from './kelas.service';
import { CreateKelasDto, UpdateKelasDto, SetWaliDto } from './dto/create-kelas.dto';
export declare class KelasController {
    private readonly svc;
    constructor(svc: KelasService);
    list(q: KelasFilter): Promise<{
        data: import("./kelas.entity").Kelas[];
        total: number;
        page: number;
        limit: number;
    }>;
    one(id: number): Promise<import("./kelas.entity").Kelas>;
    create(body: CreateKelasDto, req: Request): Promise<import("./kelas.entity").Kelas>;
    update(id: number, body: UpdateKelasDto, req: Request): Promise<import("./kelas.entity").Kelas>;
    setWali(id: number, body: SetWaliDto, req: Request): Promise<import("./kelas.entity").Kelas>;
    remove(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
}
