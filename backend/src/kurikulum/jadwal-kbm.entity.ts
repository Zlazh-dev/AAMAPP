import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Penugasan } from './penugasan.entity';

/**
 * T11-FIX Ronde 2 (Butir 6) + T12: Jadwal KBM.
 * Tiap slot = 1 penugasan + hari + jamMulai + jamSelesai (+ sesiKe opsional).
 *
 * T12-FIX: UNIQUE constraint HAPUS karena UNIQUE(penugasanId, hari, jamMulai)
 * TIDAK cukup — overlap INTERVAL waktu pada hari yang sama harus ditolak
 * (mis. 07.00–07.40 bentrok dengan 07.30–08.10). Validasi bentrok dilakukan
 * di SERVICE dengan perbandingan interval eksplisit, bukan UNIQUE constraint.
 *
 * Hari: 1=Senin ... 6=Sabtu (sesuai spec §14.10.1 — Minggu TIDAK dijadwalkan).
 */
@Entity('jadwal_kbm')
export class JadwalKbm {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => Penugasan, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'penugasanId' })
  penugasan: Penugasan;

  @Column({ type: 'integer' })
  penugasanId: number;

  /** 1=Senin ... 6=Sabtu (Minggu tidak dijadwalkan). */
  @Column({ type: 'integer' })
  hari: number;

  /** Format HH:MM (WIB). */
  @Column({ type: 'time' })
  jamMulai: string;

  /** Format HH:MM (WIB). */
  @Column({ type: 'time' })
  jamSelesai: string;

  /** Nomor sesi ke- dalam hari itu (opsional; 1..N). Untuk tampilan urutan. */
  @Column({ type: 'integer', nullable: true })
  sesiKe: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
