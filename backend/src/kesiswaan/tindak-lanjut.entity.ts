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
import { Siswa } from '../siswa/siswa.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { User } from '../users/user.entity';

export type TahapTindakLanjut =
  | 'PERINGATAN_1'
  | 'PERINGATAN_2'
  | 'PERINGATAN_3'
  | 'TINDAKAN_KHUSUS';

/**
 * Tabel tindak_lanjut — satu baris per siswa per tahap per semester.
 * Dibuat OTOMATIS oleh sistem saat terpotong mencapai ambang §7.3.
 * UNIQUE (siswaId, tahunAjaranId, tahap) → idempotent.
 */
@Entity('tindak_lanjut')
@Unique('UQ_tindak_lanjut_siswa_ta_tahap', ['siswaId', 'tahunAjaranId', 'tahap'])
export class TindakLanjut {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  siswaId: number;

  @ManyToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siswaId' })
  siswa: Siswa;

  @Column({ type: 'int' })
  tahunAjaranId: number;

  @ManyToOne(() => TahunAjaran, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tahunAjaranId' })
  tahunAjaran: TahunAjaran;

  /** Tahap sesuai §7.3 */
  @Column({ type: 'varchar', length: 20 })
  tahap: TahapTindakLanjut;

  /** Ambang poin terpotong yang memicu tahap ini (200/300/400/500) */
  @Column({ type: 'int' })
  ambang: number;

  @Column({ type: 'varchar', length: 10, default: 'BARU' })
  status: 'BARU' | 'SELESAI';

  @Column({ type: 'text', nullable: true })
  catatanPelaksanaan: string | null;

  @Column({ type: 'int', nullable: true })
  dilaksanakanOleh: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dilaksanakanOleh' })
  pelaksana: User;

  @Column({ type: 'timestamptz', nullable: true })
  dilaksanakanPada: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
