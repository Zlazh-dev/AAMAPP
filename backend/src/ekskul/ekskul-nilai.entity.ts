import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { EkskulPeserta } from './ekskul-peserta.entity';
import { EkskulTujuan } from './ekskul-tujuan.entity';

export type NilaiEkskul = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';

/**
 * Nilai per peserta per tujuan (SB/B/C/K).
 * UNIQUE(pesertaId, tujuanId) — single pembina, tidak dirata.
 */
@Entity('ekskul_nilai')
@Unique('UQ_ekskul_nilai', ['pesertaId', 'tujuanId'])
export class EkskulNilai {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  pesertaId: number;

  @ManyToOne(() => EkskulPeserta, (p) => p.nilai, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pesertaId' })
  peserta: EkskulPeserta;

  @Column({ type: 'int' })
  tujuanId: number;

  @ManyToOne(() => EkskulTujuan, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tujuanId' })
  tujuan: EkskulTujuan;

  @Column({ type: 'varchar', length: 20 })
  nilai: NilaiEkskul;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
