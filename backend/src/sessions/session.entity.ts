import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @ManyToOne(() => User, (user) => user.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'char', length: 64 })
  tokenHash: string;

  @Column({ type: 'varchar', length: 255 })
  ipAddress: string;

  @Column({ type: 'text' })
  userAgent: string;

  @Column({ type: 'varchar', length: 255 })
  deviceSummary: string;

  /**
   * Identitas perangkat sungguhan — cookie acak httpOnly sameSite=lax
   * umur ±1 tahun. Dipakai untuk dedupe sesi: login kedua dari perangkat
   * yg sama memperbarui baris yg ada, bukan menyisipkan baris baru.
   * Bukan dedupe by deviceSummary (label "Chrome - Windows" menyatu semua).
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  deviceId: string | null;

  @Column({ type: 'varchar', length: 50 })
  loginMethod: string; // 'password' | 'google'

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  lastActiveAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;
}
