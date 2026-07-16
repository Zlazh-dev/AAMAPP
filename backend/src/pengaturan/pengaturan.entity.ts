import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pengaturan')
export class Pengaturan {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string; // ex: 'profil_sekolah', 'jam_presensi', 'lokasi', 'kkm'

  @Column({ type: 'jsonb' })
  value: any;

  /** Nama user yang terakhir menyimpan (diisi saat PATCH). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  updatedByName: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
