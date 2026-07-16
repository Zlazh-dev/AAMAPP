import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
export declare class UploadsController {
    private readonly audit;
    constructor(audit: AuditService);
    upload(file: Express.Multer.File, req: Request): Promise<{
        ok: boolean;
        filename: string;
        url: string;
        size: number;
        mime: string;
    }>;
}
