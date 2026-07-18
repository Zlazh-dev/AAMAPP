import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('katalog_pelanggaran')
export class KatalogPelanggaran {
  @PrimaryGeneratedColumn()
  id: number;

  /** Nomor urut butir (1–28, dll.) */
  @Column({ type: 'int' })
  nomor: number;

  /** Deskripsi bentuk pelanggaran */
  @Column({ type: 'text' })
  bentuk: string;

  /** Kategori: R=10, S=25, B=50, SB=100 */
  @Column({ type: 'varchar', length: 10 })
  kategori: 'R' | 'S' | 'B' | 'SB';

  /** Poin default sesuai kategori */
  @Column({ type: 'int' })
  poin: number;

  /** Butir aktif (soft-delete: aktif=false) */
  @Column({ type: 'boolean', default: true })
  aktif: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
