import { Request, Response } from 'express';
import { ImportService } from './import.service';
export declare class ImportController {
    private readonly svc;
    constructor(svc: ImportService);
    template(jenis: string, res: Response): Promise<void>;
    preview(jenis: string, file: Express.Multer.File): Promise<import("./import.service").ImportPreviewResult>;
    commit(jenis: string, file: Express.Multer.File, req: Request): Promise<import("./import.service").ImportCommitResult>;
    private normalizeJenis;
}
