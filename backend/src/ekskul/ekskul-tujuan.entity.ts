import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Ekskul } from './ekskul.entity';

/**
 * Tujuan per ekskul per semester — pembina yang buat.
 * Deskripsi tujuan yang akan dinilai.
 */
@Entity('ekskul_tujuan')
export class EkskulTujuan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  ekskulId: number;

  @ManyToOne(() => Ekskul, (e) => e.tujuan, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ekskulId' })
  ekskul: Ekskul;

  @Column({ type: 'int' })
  semester: number;

  @Column({ type: 'text' })
  deskripsi: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
