import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Penilaian } from './penilaian.entity';
import { TujuanPembelajaran } from './tujuan-pembelajaran.entity';

/**
 * Junction tabel: penilaian ↔ tujuan_pembelajaran (hanya untuk Sumatif TP).
 * Composite PK (penilaianId, tpId).
 */
@Entity('penilaian_tp')
export class PenilaianTp {
  @PrimaryColumn({ type: 'int' })
  penilaianId: number;

  @ManyToOne(() => Penilaian, (p) => p.tpLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'penilaianId' })
  penilaian: Penilaian;

  @PrimaryColumn({ type: 'int' })
  tpId: number;

  @ManyToOne(() => TujuanPembelajaran, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tpId' })
  tp: TujuanPembelajaran;
}
