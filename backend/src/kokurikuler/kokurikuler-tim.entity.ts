import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { KokurikulerKegiatan } from './kokurikuler-kegiatan.entity';
import { Kelas } from '../kelas/kelas.entity';
import { Guru } from '../guru/guru.entity';

/**
 * Tim penilai kegiatan per kelas.
 * PK komposit (kegiatanId, kelasId, guruId).
 * Satu kegiatan bisa punya banyak guru penilai per kelas.
 */
@Entity('kokurikuler_tim')
export class KokurikulerTim {
  @PrimaryColumn({ type: 'int' })
  kegiatanId: number;

  @PrimaryColumn({ type: 'int' })
  kelasId: number;

  @PrimaryColumn({ type: 'int' })
  guruId: number;

  @ManyToOne(() => KokurikulerKegiatan, (k) => k.tim, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kegiatanId' })
  kegiatan: KokurikulerKegiatan;

  @ManyToOne(() => Kelas, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kelasId' })
  kelas: Kelas;

  @ManyToOne(() => Guru, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guruId' })
  guru: Guru;

  @CreateDateColumn()
  createdAt: Date;
}
