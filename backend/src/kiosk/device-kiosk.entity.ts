import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * F3b — Perangkat kiosk yang ter-pair dengan sekolah.
 * Pairing: admin buat device → dapat kode 6-digit 10 mnt →
 * kiosk POST /api/kiosk/pair → tukar kode menjadi token perangkat.
 * Otentikasi kiosk: header X-Device-Token (bukan session user).
 */
@Entity('device_kiosk')
export class DeviceKiosk {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  /** Nama perangkat (label admin, mis. "Kamera Depan"). */
  @Column({ type: 'varchar', length: 100 })
  nama: string;

  /**
   * SHA-256 hex dari token perangkat.
   * null = belum di-pair.
   */
  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  tokenHash: string | null;

  /**
   * Kode pairing 6 digit (plaintext, short-lived).
   * null = tidak ada kode aktif.
   */
  @Column({ type: 'varchar', length: 6, nullable: true })
  pairingCode: string | null;

  /** Kapan kode pairing kadaluarsa (10 menit setelah dibuat). */
  @Column({ type: 'timestamptz', nullable: true })
  pairingExpiresAt: Date | null;

  /** Terakhir kirim heartbeat — untuk turunan isOnline (< 2 menit = online). */
  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
