import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { PenilaianTp } from './penilaian-tp.entity';
import { Nilai } from './nilai.entity';

export type JenisPenilaian = 'Formatif' | 'Sumatif';
export type SubjenisPenilaian =
  | 'SUMATIF_TP'
  | 'SUMATIF_AKHIR_SEMESTER'
  | 'SUMATIF_AKHIR_TAHUN';

/**
 * Penilaian — per paket penugasan.
 * Formatif: bobot masuk rekap Formatif, TIDAK masuk nilai akhir.
 * Sumatif: bobot masuk formula round(Σ(nilai×bobot)/Σbobot).
 */
@Entity('penilaian')
export class Penilaian {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  penugasanId: number;

  @ManyToOne(() => Penugasan, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'penugasanId' })
  penugasan: Penugasan;

  @Column({ type: 'varchar', length: 200 })
  nama: string;

  @Column({ type: 'varchar', length: 10 })
  jenis: JenisPenilaian;

  @Column({ type: 'varchar', length: 30, nullable: true })
  subjenis: SubjenisPenilaian | null;

  /** Bobot ≥ 1 (untuk Formatif ini hanya catatan, tak masuk formula Sumatif) */
  @Column({ type: 'int' })
  bobot: number;

  @Column({ type: 'date' })
  tanggal: string;

  @OneToMany(() => PenilaianTp, (pt) => pt.penilaian, { cascade: true })
  tpLinks: PenilaianTp[];

  @OneToMany(() => Nilai, (n) => n.penilaian)
  nilaiList: Nilai[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
