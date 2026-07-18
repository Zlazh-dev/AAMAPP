import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { KokurikulerTarget } from './kokurikuler-target.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';

export type NilaiKualitatif = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';

/** Skor numerik untuk konversi rata-rata */
export const SKOR_MAP: Record<NilaiKualitatif, number> = {
  'Sangat Baik': 4,
  'Baik': 3,
  'Cukup': 2,
  'Kurang': 1,
};

/**
 * Asesmen per siswa per target dimensi per penilai.
 * UNIQUE(targetId, siswaId, penilaiGuruId) → satu nilai per penilai.
 */
@Entity('kokurikuler_asesmen')
@Unique('UQ_kokurikuler_asesmen', ['targetId', 'siswaId', 'penilaiGuruId'])
export class KokurikulerAsesmen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  targetId: number;

  @ManyToOne(() => KokurikulerTarget, (t) => t.asesmen, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetId' })
  target: KokurikulerTarget;

  @Column({ type: 'int' })
  siswaId: number;

  @ManyToOne(() => Siswa, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siswaId' })
  siswa: Siswa;

  @Column({ type: 'int' })
  penilaiGuruId: number;

  @ManyToOne(() => Guru, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'penilaiGuruId' })
  penilaiGuru: Guru;

  @Column({ type: 'varchar', length: 20 })
  nilai: NilaiKualitatif;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
