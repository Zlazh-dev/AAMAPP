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
import { Guru } from '../guru/guru.entity';

export type StatusPresensiGuru = 'HADIR' | 'TERLAMBAT' | 'ALPHA';
export type SourcePresensiGuru = 'HP' | 'MANUAL' | 'KIOSK';

/**
 * F3a — Presensi harian guru (satu baris per guru per hari).
 * Dibuat saat guru scan wajah (source=HP) atau admin input manual (source=MANUAL).
 * Status HADIR/TERLAMBAT diturunkan dari jam_presensi saat check-in;
 * ALPHA hanya di-set via input manual admin.
 */
@Entity('presensi_harian_guru')
@Unique(['guruId', 'tanggal'])
export class PresensiHarianGuru {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => Guru, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guruId' })
  guru: Guru;

  @Column({ type: 'integer' })
  guruId: number;

  /** Tanggal presensi (WIB, format YYYY-MM-DD). */
  @Column({ type: 'date' })
  tanggal: string;

  /** Waktu check-in (nullable sampai scan pertama). */
  @Column({ type: 'timestamptz', nullable: true })
  checkInAt: Date | null;

  /** Waktu check-out (nullable sampai scan kedua / mode pulang). */
  @Column({ type: 'timestamptz', nullable: true })
  checkOutAt: Date | null;

  /** HADIR | TERLAMBAT | ALPHA. ALPHA hanya via manual/derivasi. */
  @Column({ type: 'varchar', length: 20 })
  status: StatusPresensiGuru;

  /** HP (scan wajah mandiri) | MANUAL (input admin). KIOSK menyusul F3b. */
  @Column({ type: 'varchar', length: 20 })
  source: SourcePresensiGuru;

  /** Jarak dari titik sekolah saat scan (meter) — null jika geofence nonaktif atau MANUAL. */
  @Column({ type: 'float', nullable: true })
  distanceMeter: number | null;

  /** Skor cosine similarity saat scan — null jika MANUAL. */
  @Column({ type: 'float', nullable: true })
  similarity: number | null;

  /** Alasan (wajib untuk input MANUAL admin). */
  @Column({ type: 'text', nullable: true })
  alasan: string | null;

  /**
   * F3b — Kiosk 1:N: true bila scan kiosk hasilnya ambigu (gap terlalu kecil)
   * atau NIP-manual belum dikonfirmasi admin.
   */
  @Column({ type: 'boolean', default: false })
  perluVerifikasi: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
