import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/**
 * T11-FIX Ronde 2 (Bug Baru 1): UNIQUE di level (nama, semester)
 * bukan hanya `nama` — supaya bisa ada baris terpisah untuk
 * Semester 1 dan Semester 2 di tahun ajaran yang sama.
 */
@Entity('tahun_ajaran')
@Unique(['nama', 'semester'])
export class TahunAjaran {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  /** ex: "2025/2026". */
  @Column({ type: 'varchar', length: 9 })
  nama: string;

  /** 1 = Ganjil, 2 = Genap. */
  @Column({ type: 'integer' })
  semester: 1 | 2;

  /** Hanya satu TA yang boleh aktif pada satu waktu (service-enforced). */
  @Column({ type: 'boolean', default: false })
  aktif: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
