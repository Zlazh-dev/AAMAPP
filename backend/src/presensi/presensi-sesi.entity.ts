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
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { Guru } from '../guru/guru.entity';

/**
 * F2 — instans sesi KBM pada TANGGAL nyata (bukan template mingguan).
 * `jadwal_kbm` = slot mingguan berulang; `presensi_sesi` = pelaksanaan
 * satu slot pada satu tanggal. Dibuat saat roster DISIMPAN pertama kali.
 *
 * Status sesi (TERLAKSANA/KOSONG/DIGANTIKAN) DITURUNKAN, bukan kolom:
 * - ada baris presensi_sesi           → TERLAKSANA
 * - jam lewat & tak ada baris          → KOSONG
 * - guruPenggantiId terisi             → DIGANTIKAN
 * (keputusan planner F2-SPEC pertanyaan #1).
 */
@Entity('presensi_sesi')
@Unique(['jadwalKbmId', 'tanggal'])
export class PresensiSesi {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => JadwalKbm, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'jadwalKbmId' })
  jadwalKbm: JadwalKbm;

  @Column({ type: 'integer' })
  jadwalKbmId: number;

  /** Tanggal pelaksanaan (WIB, format YYYY-MM-DD). */
  @Column({ type: 'date' })
  tanggal: string;

  /** Guru yang menyimpan roster (pemilik paket, atau pengganti). */
  @ManyToOne(() => Guru, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guruPelaksanaId' })
  guruPelaksana: Guru;

  @Column({ type: 'integer' })
  guruPelaksanaId: number;

  /** Terisi bila pelaksana ≠ guru pemilik paket (sesi DIGANTIKAN). */
  @ManyToOne(() => Guru, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'guruPenggantiId' })
  guruPengganti: Guru | null;

  @Column({ type: 'integer', nullable: true })
  guruPenggantiId: number | null;

  /** Kapan roster pertama kali disimpan (WIB). */
  @Column({ type: 'timestamptz' })
  disimpanPada: Date;

  /**
   * Kapan guru menekan "Hadir & Mulai" dengan validasi geofence (nullable).
   * NULL = sesi lama (sebelum fitur hadir-sesi) atau belum hadir.
   */
  @Column({ type: 'timestamptz', nullable: true })
  guruHadirPada: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
