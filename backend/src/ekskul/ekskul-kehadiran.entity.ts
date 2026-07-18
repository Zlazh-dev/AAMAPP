import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { EkskulPeserta } from './ekskul-peserta.entity';

/**
 * Kehadiran per peserta per semester.
 * UNIQUE(pesertaId, semester).
 * Kehadiran% = jumlahHadir / totalPertemuan * 100 — TURUNAN.
 * MERAH = < 70%.
 */
@Entity('ekskul_kehadiran')
@Unique('UQ_ekskul_kehadiran', ['pesertaId', 'semester'])
export class EkskulKehadiran {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  pesertaId: number;

  @ManyToOne(() => EkskulPeserta, (p) => p.kehadiran, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pesertaId' })
  peserta: EkskulPeserta;

  @Column({ type: 'int' })
  semester: number;

  @Column({ type: 'int', default: 0 })
  jumlahHadir: number;

  @Column({ type: 'int', default: 0 })
  totalPertemuan: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
