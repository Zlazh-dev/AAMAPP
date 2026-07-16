import { Request } from 'express';
import { SiswaService, SiswaFilter } from './siswa.service';
import { CreateSiswaDto, UpdateSiswaDto } from './dto/create-siswa.dto';
export declare class SiswaController {
    private readonly svc;
    constructor(svc: SiswaService);
    list(q: SiswaFilter): Promise<{
        data: import("./siswa.entity").Siswa[];
        total: number;
        page: number;
        limit: number;
    }>;
    one(id: number): Promise<import("./siswa.entity").Siswa>;
    create(body: CreateSiswaDto, req: Request): Promise<import("./siswa.entity").Siswa>;
    update(id: number, body: UpdateSiswaDto, req: Request): Promise<import("./siswa.entity").Siswa>;
    remove(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
}
