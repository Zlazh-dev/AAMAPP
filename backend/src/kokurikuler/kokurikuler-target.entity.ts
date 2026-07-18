import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { KokurikulerKegiatan } from './kokurikuler-kegiatan.entity';
import { KokurikulerAsesmen } from './kokurikuler-asesmen.entity';

/** 8 dimensi lulusan resmi (§F6c) */
export const DIMENSI_LULUSAN = [
  'Keimanan dan Ketakwaan terhadap Tuhan YME',
  'Kewargaan',
  'Penalaran Kritis',
  'Kreativitas',
  'Kolaborasi',
  'Kemandirian',
  'Kesehatan',
  'Komunikasi',
] as const;

export type NamaDimensi = (typeof DIMENSI_LULUSAN)[number];

/**
 * Target dimensi per kegiatan — pilih dari 8 dimensi lulusan.
 * UNIQUE(kegiatanId, namaDimensi).
 */
@Entity('kokurikuler_target')
@Unique('UQ_kokurikuler_target_dimensi', ['kegiatanId', 'namaDimensi'])
export class KokurikulerTarget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  kegiatanId: number;

  @ManyToOne(() => KokurikulerKegiatan, (k) => k.targets, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kegiatanId' })
  kegiatan: KokurikulerKegiatan;

  @Column({ type: 'varchar', length: 100 })
  namaDimensi: string;

  @OneToMany(() => KokurikulerAsesmen, (a) => a.target, { cascade: true })
  asesmen: KokurikulerAsesmen[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
