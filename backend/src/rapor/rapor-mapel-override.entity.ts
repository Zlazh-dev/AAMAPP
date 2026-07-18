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
import { Rapor } from './rapor.entity';
import { Mapel } from '../kurikulum/mapel.entity';

/**
 * Override per mapel dalam rapor — nilaiKatrol dan/atau deskripsiOverride.
 * UNIQUE(raporId, mapelId).
 */
@Entity('rapor_mapel_override')
@Unique('UQ_rapor_mapel_override', ['raporId', 'mapelId'])
export class RaporMapelOverride {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  raporId: number;

  @ManyToOne(() => Rapor, (r) => r.overrides, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'raporId' })
  rapor: Rapor;

  @Column({ type: 'int' })
  mapelId: number;

  @ManyToOne(() => Mapel, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mapelId' })
  mapel: Mapel;

  /** Nilai katrol 0–100 (menggantikan nilai akhir dalam rapor) */
  @Column({ type: 'int', nullable: true })
  nilaiKatrol: number | null;

  /** Deskripsi capaian manual (menggantikan deskripsi otomatis) */
  @Column({ type: 'text', nullable: true })
  deskripsiOverride: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
