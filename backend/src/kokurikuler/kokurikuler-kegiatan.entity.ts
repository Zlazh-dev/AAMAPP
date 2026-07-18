import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { KokurikulerTarget } from './kokurikuler-target.entity';
import { KokurikulerTim } from './kokurikuler-tim.entity';

/**
 * Kegiatan kokurikuler — tema + semester, dikelola kurikulum/admin.
 * Setiap kegiatan punya target dimensi (dari 8 dimensi lulusan) dan tim penilai.
 */
@Entity('kokurikuler_kegiatan')
export class KokurikulerKegiatan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tahunAjaranId: number;

  @ManyToOne(() => TahunAjaran, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tahunAjaranId' })
  tahunAjaran: TahunAjaran;

  /** Semester 1 atau 2 */
  @Column({ type: 'int' })
  semester: number;

  @Column({ type: 'varchar', length: 255 })
  tema: string;

  @OneToMany(() => KokurikulerTarget, (t) => t.kegiatan, { cascade: true })
  targets: KokurikulerTarget[];

  @OneToMany(() => KokurikulerTim, (t) => t.kegiatan, { cascade: true })
  tim: KokurikulerTim[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
