import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Guru } from '../guru/guru.entity';

export type KelasFase = 'D' | 'E' | 'F';

@Entity('kelas')
export class Kelas {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nama: string;

  @Column({ type: 'integer' })
  tingkat: number; // 7 | 8 | 9

  @Column({ type: 'varchar', length: 1, default: 'D' })
  fase: KelasFase;

  @Column({ type: 'integer', nullable: true, unique: true })
  waliGuruId: number | null;

  @ManyToOne(() => Guru, (guru) => guru.waliKelas, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'waliGuruId' })
  waliGuru: Guru | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
