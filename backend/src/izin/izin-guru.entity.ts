import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Guru } from '../guru/guru.entity';
import { User } from '../users/user.entity';

export type JenisIzin = 'IZIN' | 'SAKIT' | 'DINAS';
export type StatusIzin = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';

/**
 * F4a — Izin guru (rentang tanggal, status approval).
 *
 * Prinsip: status harian diturunkan (derived), BUKAN disimpan di
 * presensi_harian_guru. Helper deriveStatusHarian() membaca tabel ini
 * via batch-fetch untuk menjauhi N+1.
 *
 * Validasi: selesaiTanggal ≥ mulaiTanggal (DTO); jenis & status via IsIn.
 */
@Entity('izin_guru')
@Index(['guruId', 'status'])
export class IzinGuru {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => Guru, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guruId' })
  guru: Guru;

  @Column({ type: 'integer' })
  guruId: number;

  /** IZIN | SAKIT | DINAS */
  @Column({ type: 'varchar', length: 10 })
  jenis: JenisIzin;

  /** Awal rentang izin (inklusif, WIB, format YYYY-MM-DD). */
  @Column({ type: 'date' })
  mulaiTanggal: string;

  /** Akhir rentang izin (inklusif, WIB, format YYYY-MM-DD). */
  @Column({ type: 'date' })
  selesaiTanggal: string;

  /** Keterangan/alasan pengajuan — WAJIB. */
  @Column({ type: 'text' })
  keterangan: string;

  /** URL lampiran opsional (foto surat dokter, dll). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  lampiranUrl: string | null;

  /** MENUNGGU | DISETUJUI | DITOLAK. Default MENUNGGU saat diajukan. */
  @Column({ type: 'varchar', length: 15, default: 'MENUNGGU' })
  status: StatusIzin;

  /** User (admin/kepsek) yang menyetujui/menolak. Null sebelum keputusan. */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'disetujuiOleh' })
  approver: User | null;

  @Column({ type: 'integer', nullable: true })
  disetujuiOleh: number | null;

  /** Waktu keputusan. */
  @Column({ type: 'timestamptz', nullable: true })
  disetujuiPada: Date | null;

  /** Alasan keputusan (wajib saat DITOLAK). */
  @Column({ type: 'text', nullable: true })
  alasanKeputusan: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
