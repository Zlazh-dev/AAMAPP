import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/**
 * T11-FIX Ronde 2 (Butir 5): Mata pelajaran.
 *  - kode UNIQUE (mis. 'MAT', 'BIN', 'IPA')
 *  - kelompok NULLable (A/B/C dari spec kurikulum; tidak digunakan F1)
 *  - urutan int default 0 (urut tampil)
 */
@Entity('mapel')
@Unique(['kode'])
export class Mapel {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nama: string;

  @Column({ type: 'varchar', length: 20 })
  kode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  kelompok: string | null;

  @Column({ type: 'integer', default: 0 })
  urutan: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
