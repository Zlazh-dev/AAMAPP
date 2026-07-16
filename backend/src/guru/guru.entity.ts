import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Kelas } from '../kelas/kelas.entity';

export type GuruStatus = 'aktif' | 'nonaktif';
export type JenisKelamin = 'L' | 'P';

@Entity('guru')
export class Guru {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nama: string;

  @Column({ type: 'varchar', length: 30, nullable: true, unique: true })
  nip: string | null;

  @Column({ type: 'varchar', length: 1 })
  jenisKelamin: JenisKelamin;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telepon: string | null;

  @Column({ type: 'varchar', length: 500, default: '' })
  fotoUrl: string;

  @Column({ type: 'varchar', length: 20, default: 'aktif' })
  status: GuruStatus;

  @Column({ type: 'integer', nullable: true, unique: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Kelas yang di-wali (relasi balik 1-1 via waliGuruId)
  @OneToMany(() => Kelas, (kelas) => kelas.waliGuru)
  waliKelas: Kelas[];
}
