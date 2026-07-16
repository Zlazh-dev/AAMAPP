import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Session } from '../sessions/session.entity';
import { ActivityLog } from '../audit/activity-log.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  googleSub: string | null;

  @Column({ type: 'varchar', default: 'active' })
  status: string; // 'active' | 'pending'

  @Column({ type: 'jsonb', default: '[]' })
  roles: string[];

  @Column({ type: 'jsonb', default: '[]' })
  requestedRoles: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  registrationNote: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => ActivityLog, (log) => log.user)
  activityLogs: ActivityLog[];

  // helper computed (not persisted)
  get hasPassword(): boolean {
    return !!this.passwordHash;
  }

  get googleLinked(): boolean {
    return !!this.googleSub;
  }
}
