import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Mapel } from './mapel.entity';
import { Kelas } from '../kelas/kelas.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Guru } from '../guru/guru.entity';

/**
 * T11-FIX Ronde 2 (Butir 6) + T12: Penugasan mengajar.
 * UNIQUE(mapelId, kelasId, tahunAjaranId) = satu mapel di kelas yang
 * sama pada TA yang sama hanya boleh 1 penugasan (satu guru pengampu).
 * Paket = "guru mengajar mapel X di kelas Y" — sumber turunan presensi,
 * penilaian, & rapor.
 * T12-FIX: guruId WAJIB (NOT NULL) + ManyToOne Guru (RESTRICT, bukan
 * CASCADE, agar hapus guru harus lewat cek 409 eksplisit).
 */
@Entity('penugasan')
@Unique(['mapelId', 'kelasId', 'tahunAjaranId'])
export class Penugasan {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => Mapel, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mapelId' })
  mapel: Mapel;

  @Column({ type: 'integer' })
  mapelId: number;

  @ManyToOne(() => Kelas, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'kelasId' })
  kelas: Kelas;

  @Column({ type: 'integer' })
  kelasId: number;

  @ManyToOne(() => TahunAjaran, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tahunAjaranId' })
  tahunAjaran: TahunAjaran;

  @Column({ type: 'integer' })
  tahunAjaranId: number;

  /**
   * T12-FIX: guruId FK WAJIB (bukan nullable) + relasi ManyToOne Guru.
   * onDelete RESTRICT: hapus guru yg punya penugasan → 409 (bukan cascade
   * agar tidak hilang data diam-diam).
   */
  @ManyToOne(() => Guru, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guruId' })
  guru: Guru;

  @Column({ type: 'integer' })
  guruId: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
