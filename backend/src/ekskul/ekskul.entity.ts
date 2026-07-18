import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Guru } from '../guru/guru.entity';
import { EkskulPeserta } from './ekskul-peserta.entity';
import { EkskulTujuan } from './ekskul-tujuan.entity';

/**
 * Ekstrakurikuler — dikelola admin.
 * Pembina = satu guru; authorization service cek pembinaGuruId.
 */
@Entity('ekskul')
export class Ekskul {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nama: string;

  @Column({ type: 'int', nullable: true })
  pembinaGuruId: number | null;

  @ManyToOne(() => Guru, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pembinaGuruId' })
  pembina: Guru | null;

  @OneToMany(() => EkskulPeserta, (p) => p.ekskul, { cascade: true })
  peserta: EkskulPeserta[];

  @OneToMany(() => EkskulTujuan, (t) => t.ekskul, { cascade: true })
  tujuan: EkskulTujuan[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
