import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, Unique,
} from 'typeorm';
import { Ekskul } from './ekskul.entity';
import { Siswa } from '../siswa/siswa.entity';
import { EkskulNilai } from './ekskul-nilai.entity';
import { EkskulKehadiran } from './ekskul-kehadiran.entity';

/** Peserta ekskul — UNIQUE(ekskulId, siswaId). */
@Entity('ekskul_peserta')
@Unique('UQ_ekskul_peserta', ['ekskulId', 'siswaId'])
export class EkskulPeserta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  ekskulId: number;

  @ManyToOne(() => Ekskul, (e) => e.peserta, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ekskulId' })
  ekskul: Ekskul;

  @Column({ type: 'int' })
  siswaId: number;

  @ManyToOne(() => Siswa, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siswaId' })
  siswa: Siswa;

  @OneToMany(() => EkskulNilai, (n) => n.peserta, { cascade: true })
  nilai: EkskulNilai[];

  @OneToMany(() => EkskulKehadiran, (k) => k.peserta, { cascade: true })
  kehadiran: EkskulKehadiran[];

  @CreateDateColumn()
  createdAt: Date;
}
