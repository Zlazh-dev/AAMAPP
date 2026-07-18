import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Siswa } from '../siswa/siswa.entity';
import { KatalogPelanggaran } from './katalog-pelanggaran.entity';
import { User } from '../users/user.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';

/**
 * Tabel pelanggaran siswa.
 *
 * Dedup R-07 (OTOMATIS_T): UNIQUE (siswaId, tanggal, katalogId, sumber)
 * untuk sumber='OTOMATIS_T' — dijaga via upsert (INSERT ON CONFLICT DO NOTHING).
 */
@Entity('pelanggaran')
@Index(['siswaId', 'tahunAjaranId', 'status'])
@Unique('UQ_pelanggaran_otomatis_t', ['siswaId', 'tanggal', 'katalogId', 'sumber'])
export class Pelanggaran {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  siswaId: number;

  @ManyToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siswaId' })
  siswa: Siswa;

  /** null = KHUSUS (tanpa butir katalog) */
  @Column({ type: 'int', nullable: true })
  katalogId: number | null;

  @ManyToOne(() => KatalogPelanggaran, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'katalogId' })
  katalog: KatalogPelanggaran;

  /** Snapshot kategori saat dicatat (riwayat abadi) */
  @Column({ type: 'varchar', length: 10 })
  kategori: 'R' | 'S' | 'B' | 'SB' | 'KHUSUS';

  /** Snapshot poin saat dicatat — 0 untuk KHUSUS */
  @Column({ type: 'int' })
  poin: number;

  /** Tanggal pelanggaran (WIB, format YYYY-MM-DD) */
  @Column({ type: 'varchar', length: 10 })
  tanggal: string;

  @Column({ type: 'text', nullable: true })
  catatan: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  buktiUrl: string | null;

  @Column({ type: 'varchar', length: 20 })
  sumber: 'LANGSUNG' | 'LAPORAN' | 'OTOMATIS_T';

  @Column({ type: 'varchar', length: 20, default: 'MENUNGGU' })
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';

  /** User yang mencatat / melapor (SET NULL bila dihapus) */
  @Column({ type: 'int', nullable: true })
  pelaporId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pelaporId' })
  pelapor: User;

  /** User yang memverifikasi (SET NULL bila dihapus) */
  @Column({ type: 'int', nullable: true })
  verifikatorId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verifikatorId' })
  verifikator: User;

  @Column({ type: 'timestamptz', nullable: true })
  verifikasiPada: Date | null;

  @Column({ type: 'text', nullable: true })
  alasanKeputusan: string | null;

  /** Scope semester — reset otomatis karena per-TA aktif */
  @Column({ type: 'int' })
  tahunAjaranId: number;

  @ManyToOne(() => TahunAjaran, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tahunAjaranId' })
  tahunAjaran: TahunAjaran;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
