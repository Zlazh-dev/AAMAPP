import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/**
 * T11-FIX Ronde 2 (Butir 6) + T12: Kalender libur sekolah.
 * T12-FIX: spec HANYA {tanggal UNIQUE, keterangan}. Kolom `nama` & `jenis`
 * dihapus — semua info digabung di `keterangan` (mis. "17 Agustus 2026 —
 * Hari Kemerdekaan RI", "Idul Fitri 1447 H", dst).
 * `tanggal` UNIQUE: satu tanggal hanya satu entry libur.
 */
@Entity('kalender_libur')
@Unique(['tanggal'])
export class KalenderLibur {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  /** Tanggal libur (format YYYY-MM-DD, zona WIB). */
  @Column({ type: 'date' })
  tanggal: string;

  /** Keterangan bebas (nama hari libur, jenis, dsb.). */
  @Column({ type: 'varchar', length: 255 })
  keterangan: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
