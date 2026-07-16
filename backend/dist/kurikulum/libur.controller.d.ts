import { Request } from 'express';
import { KurikulumService } from '../kurikulum/kurikulum.service';
import { CreateLiburDto } from '../kurikulum/dto/create-libur.dto';
export declare class LiburAdminController {
    private readonly kurikulum;
    constructor(kurikulum: KurikulumService);
    list(): Promise<import("./kalender-libur.entity").KalenderLibur[]>;
    create(body: CreateLiburDto, req: Request): Promise<import("./kalender-libur.entity").KalenderLibur>;
    remove(id: number, req: Request): Promise<{
        ok: boolean;
    }>;
}
