import { Mapel } from './mapel.entity';
import { Kelas } from '../kelas/kelas.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Guru } from '../guru/guru.entity';
export declare class Penugasan {
    id: number;
    mapel: Mapel;
    mapelId: number;
    kelas: Kelas;
    kelasId: number;
    tahunAjaran: TahunAjaran;
    tahunAjaranId: number;
    guru: Guru;
    guruId: number;
    createdAt: Date;
    updatedAt: Date;
}
