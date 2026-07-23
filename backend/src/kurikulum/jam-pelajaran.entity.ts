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
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';

/**
 * JADWAL-MATRIX-FIX Butir 6: Struktur jam pelajaran (lonceng sekolah).
 *
 * Satu entitas = satu slot waktu di hari tertentu untuk TA tertentu.
 * Baris matriks jadwal diturunkan dari sini, bukan dari baris jadwal_kbm.
 *
 * Aturan:
 * - Unik per (tahunAjaranId, hari, urutan) → UNIQUE INDEX
 * - Jam tidak boleh tumpang-tindih di hari yang sama (cek di service)
 * - Hapus JP hanya bila seluruh selnya kosong (tidak ada jadwal_kbm yang
 *   mereferens jam yang sama)
 * - Mengubah jam JP → update transaksional semua jadwal_kbm di hari itu
 *   yang jamMulai = jamMulai lama (PresensiSesi aman — ref ke jadwalId)
 */
@Entity('jam_pelajaran')
@Index('UQ_jp_ta_hari_urutan', ['tahunAjaranId', 'hari', 'urutan'], { unique: true })
export class JamPelajaran {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => TahunAjaran, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tahunAjaranId' })
  tahunAjaran: TahunAjaran;

  @Column({ type: 'integer' })
  tahunAjaranId: number;

  /** 1=Senin ... 6=Sabtu */
  @Column({ type: 'integer' })
  hari: number;

  /** Urutan JP ke-N dalam hari itu (1-based, berurutan) */
  @Column({ type: 'integer' })
  urutan: number;

  /** Format HH:MM */
  @Column({ type: 'time' })
  jamMulai: string;

  /** Format HH:MM */
  @Column({ type: 'time' })
  jamSelesai: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
