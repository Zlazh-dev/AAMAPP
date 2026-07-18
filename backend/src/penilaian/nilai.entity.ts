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
import { Penilaian } from './penilaian.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';

/**
 * Nilai — satu baris per (penilaian, siswa).
 * UNIQUE(penilaianId, siswaId) — upsert-friendly.
 * nilai 0–100 (validasi di DTO, kolom plain int).
 */
@Entity('nilai')
@Unique('UQ_nilai_penilaian_siswa', ['penilaianId', 'siswaId'])
export class Nilai {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  penilaianId: number;

  @ManyToOne(() => Penilaian, (p) => p.nilaiList, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'penilaianId' })
  penilaian: Penilaian;

  @Column({ type: 'int' })
  siswaId: number;

  @ManyToOne(() => Siswa, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siswaId' })
  siswa: Siswa;

  /** Nilai 0–100 */
  @Column({ type: 'int' })
  nilai: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  catatan: string | null;

  /** Guru yang terakhir mengubah */
  @Column({ type: 'int', nullable: true })
  diubahOleh: number | null;

  @ManyToOne(() => Guru, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'diubahOleh' })
  pengubah: Guru;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
