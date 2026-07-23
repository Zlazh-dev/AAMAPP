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

  /**
   * Kode guru internal (mis. A1, A2, B1...) dari sheet KBM 7. KODE.
   * Unique & nullable — dipakai untuk link penugasan saat import KBM.
   */
  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  kode: string | null;

  @Column({ type: 'varchar', length: 1 })
  jenisKelamin: JenisKelamin;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telepon: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'varchar', length: 500, default: '' })
  fotoUrl: string;

  @Column({ type: 'varchar', length: 20, default: 'aktif' })
  status: GuruStatus;

  @Column({ type: 'integer', nullable: true, unique: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  /**
   * F3a — embedding wajah multi-pose (array of number[]).
   * null = belum enroll. Diklear saat guru nonaktif (privasi).
   */
  @Column({ type: 'jsonb', nullable: true })
  faceEmbeddings: number[][] | null;

  /**
   * F3a — kapan terakhir enrollment wajah dilakukan.
   */
  @Column({ type: 'timestamptz', nullable: true })
  faceUpdatedAt: Date | null;

  /**
   * UX-POLISH D — status validasi wajah oleh admin.
   * BELUM: belum pernah enroll.
   * MENUNGGU_VALIDASI: guru sudah enroll, menunggu persetujuan admin.
   * TERVALIDASI: admin menyetujui — scan aktif.
   * DITOLAK: admin menolak embedding (perlu enroll ulang).
   */
  @Column({ type: 'varchar', length: 25, default: 'BELUM' })
  faceStatus: 'BELUM' | 'MENUNGGU_VALIDASI' | 'TERVALIDASI' | 'DITOLAK';

  /**
   * F3b — path relatif snapshot wajah (frame pose Depan saat enroll).
   * Disimpan di FACE_SNAPSHOT_ROOT (di luar folder publik /uploads/).
   * null = enroll sebelum fitur snapshot, atau sudah dihapus (Tolak/DELETE).
   */
  @Column({ type: 'varchar', nullable: true })
  faceSnapshotUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Kelas yang di-wali (relasi balik 1-1 via waliGuruId)
  @OneToMany(() => Kelas, (kelas) => kelas.waliGuru)
  waliKelas: Kelas[];

  // F3a — presensi harian (OneToMany relasi balik, lazy string ref)
  @OneToMany('PresensiHarianGuru', 'guru')
  presensiHarian: any[];
}
