import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { PresensiSesi } from './presensi-sesi.entity';
import { Siswa } from '../siswa/siswa.entity';

export type StatusPresensi = 'H' | 'S' | 'I' | 'A' | 'T';

/**
 * F2 — detail presensi satu siswa dalam satu sesi.
 * status: H=Hadir, S=Sakit, I=Izin, A=Alpha, T=Tanpa keterangan/pelanggaran
 * (tanda 'T' jadi bahan draft R-07 di F5 — TIDAK dibangun di F2).
 * Sesi tanpa baris presensi_siswa = "tidak tercatat" (bukan alpha) —
 * rekap pakai LEFT JOIN, NULL = tidak tercatat (F2-SPEC pertanyaan #8).
 */
@Entity('presensi_siswa')
@Unique(['presensiSesiId', 'siswaId'])
export class PresensiSiswa {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => PresensiSesi, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'presensiSesiId' })
  presensiSesi: PresensiSesi;

  @Column({ type: 'integer' })
  presensiSesiId: number;

  @ManyToOne(() => Siswa, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siswaId' })
  siswa: Siswa;

  @Column({ type: 'integer' })
  siswaId: number;

  @Column({ type: 'varchar', length: 1, default: 'H' })
  status: StatusPresensi;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
