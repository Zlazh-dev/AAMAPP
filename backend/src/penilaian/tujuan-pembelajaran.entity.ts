import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Mapel } from '../kurikulum/mapel.entity';

/**
 * Tujuan Pembelajaran (TP) — per mapel.
 * Paket yang berbeda pada mapel yang sama berbagi TP (mapelId FK).
 */
@Entity('tujuan_pembelajaran')
export class TujuanPembelajaran {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  mapelId: number;

  @ManyToOne(() => Mapel, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mapelId' })
  mapel: Mapel;

  @Column({ type: 'text' })
  deskripsi: string;

  @Column({ type: 'int', default: 1 })
  urutan: number;

  @Column({ type: 'boolean', default: true })
  aktif: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
