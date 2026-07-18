import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Siswa } from '../siswa/siswa.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { User } from '../users/user.entity';
import { RaporMapelOverride } from './rapor-mapel-override.entity';

/**
 * Rapor per siswa per tahun ajaran.
 * UNIQUE(siswaId, tahunAjaranId) — satu rapor per siswa per semester.
 * Status DRAFT: data DERIVED realtime. Status FINAL: pakai snapshot jsonb.
 * Snapshot dibuat saat finalisasi agar historis tidak berubah bila
 * master/nilai berubah kemudian.
 */
@Entity('rapor')
@Unique('UQ_rapor_siswa_ta', ['siswaId', 'tahunAjaranId'])
export class Rapor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  siswaId: number;

  @ManyToOne(() => Siswa, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siswaId' })
  siswa: Siswa;

  @Column({ type: 'int' })
  tahunAjaranId: number;

  @ManyToOne(() => TahunAjaran, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tahunAjaranId' })
  tahunAjaran: TahunAjaran;

  @Column({ type: 'varchar', length: 10, default: 'DRAFT' })
  status: 'DRAFT' | 'FINAL';

  @Column({ type: 'text', nullable: true })
  catatanWali: string | null;

  @Column({ type: 'int', nullable: true })
  finalisasiOleh: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'finalisasiOleh' })
  finalisator: User;

  @Column({ type: 'timestamptz', nullable: true })
  finalisasiPada: Date | null;

  /** Snapshot seluruh rapor (jsonb) — diisi saat FINAL */
  @Column({ type: 'jsonb', nullable: true })
  snapshot: Record<string, any> | null;

  @OneToMany(() => RaporMapelOverride, (o) => o.rapor, { cascade: true })
  overrides: RaporMapelOverride[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
