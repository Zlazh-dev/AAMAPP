import { Request } from 'express';
import { PengaturanService, PengaturanKey } from './pengaturan.service';
export declare class PengaturanPublicController {
    private readonly svc;
    constructor(svc: PengaturanService);
    list(): Promise<import("./pengaturan.entity").Pengaturan[]>;
    one(key: PengaturanKey): Promise<import("./pengaturan.entity").Pengaturan>;
}
export declare class PengaturanController {
    private readonly svc;
    constructor(svc: PengaturanService);
    upsert(key: PengaturanKey, body: {
        value: any;
    } | any, req: Request): Promise<import("./pengaturan.entity").Pengaturan>;
}
