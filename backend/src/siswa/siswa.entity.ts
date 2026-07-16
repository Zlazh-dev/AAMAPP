import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Kelas } from '../kelas/kelas.entity';

export type SiswaStatus = 'aktif' | 'nonaktif';
export type JenisKelamin = 'L' | 'P';

@Entity('siswa')
export class Siswa {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nama: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  nis: string;

  @Column({ type: 'varchar', length: 30, nullable: true, unique: true })
  nisn: string | null;

  @Column({ type: 'varchar', length: 1 })
  jenisKelamin: JenisKelamin;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tempatLahir: string | null;

  @Column({ type: 'date', nullable: true })
  tanggalLahir: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  agama: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  statusDalamKeluarga: string | null;

  @Column({ type: 'integer', nullable: true })
  anakKe: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  alamat: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telepon: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  sekolahAsal: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  diterimaDiKelas: string | null;

  @Column({ type: 'date', nullable: true })
  diterimaTanggal: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  namaAyah: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pekerjaanAyah: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  namaIbu: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pekerjaanIbu: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  namaWali: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  alamatWali: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  teleponWali: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pekerjaanWali: string | null;

  @Column({ type: 'varchar', length: 500, default: '' })
  fotoUrl: string;

  @Column({ type: 'integer', nullable: true })
  kelasId: number | null;

  @ManyToOne(() => Kelas, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'kelasId' })
  kelas: Kelas | null;

  @Column({ type: 'varchar', length: 20, default: 'aktif' })
  status: SiswaStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
