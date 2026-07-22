import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guru } from '../guru/guru.entity';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';

/**
 * GuruLinkService — link dua arah Guru <-> User via email (case-insensitive).
 *
 * Dipanggil dari:
 * - UsersController.approve()  → user role-guru disetujui
 * - UsersController.create()   → user role-guru dibuat langsung
 * - GuruController.create/update → data guru baru/diupdate dgn email
 * - ImportService.commit()     → data guru diimpor dari Excel
 * - GuruController.linkBackfill → endpoint admin backfill massal
 *
 * Kontrak:
 * 1. Cari Guru.email == user.email (ilike) → set Guru.userId = user.id
 * 2. Bila Guru tidak ada sama sekali → buat Guru minimal (nama+email dari akun)
 * 3. Tidak pernah menimpa Guru.userId yang sudah terisi ke akun LAIN
 *    (konflik) — catat ke audit, jangan override diam-diam
 * 4. Idempoten: jalan 2× hasil sama
 */
@Injectable()
export class GuruLinkService {
  private readonly logger = new Logger(GuruLinkService.name);

  constructor(
    @InjectRepository(Guru) private readonly guruRepo: Repository<Guru>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  /**
   * linkUserToGuru — panggil saat user di-approve dengan role guru,
   * atau saat user dibuat langsung dengan role guru.
   */
  async linkUserToGuru(userId: number, actorId?: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;
    if (!user.roles.includes('guru')) return;

    const email = user.email.toLowerCase().trim();

    // Cari Guru by email
    const guru = await this.guruRepo
      .createQueryBuilder('g')
      .where('LOWER(g.email) = :email', { email })
      .getOne();

    if (guru) {
      if (guru.userId != null && guru.userId !== userId) {
        this.logger.warn(
          `Konflik link Guru #${guru.id} (${guru.nama}): sudah tertaut ke user #${guru.userId}, ` +
            `tidak timpa ke user #${userId}`,
        );
        await this.audit.log({
          actorId: actorId ?? null,
          action: 'GURU_LINK_CONFLICT',
          resource: 'guru',
          resourceId: String(guru.id),
          summary: `Konflik: Guru ${guru.nama} sudah tertaut ke userId=${guru.userId}, tidak ditimpa ke userId=${userId}`,
          details: { existingUserId: guru.userId, incomingUserId: userId },
        });
        return;
      }

      if (guru.userId === userId) return; // idempoten

      guru.userId = userId;
      await this.guruRepo.save(guru);
      this.logger.log(`Link Guru #${guru.id} (${guru.nama}) → User #${userId}`);
      await this.audit.log({
        actorId: actorId ?? null,
        action: 'GURU_LINK',
        resource: 'guru',
        resourceId: String(guru.id),
        summary: `Tautan otomatis: Guru ${guru.nama} (email=${email}) → userId=${userId}`,
        details: { guruId: guru.id, userId },
      });
    } else {
      // Tidak ada Guru dengan email ini → buat Guru minimal
      this.logger.log(
        `Tidak ada Guru untuk email ${email}, buat Guru minimal untuk User #${userId}`,
      );
      try {
        const newGuru = this.guruRepo.create({
          nama: user.name,
          email,
          jenisKelamin: 'L', // placeholder — harus dilengkapi
          status: 'aktif',
          fotoUrl: '',
          userId,
          nip: null,
          telepon: null,
          faceEmbeddings: null,
          faceStatus: 'BELUM',
        });
        const saved = await this.guruRepo.save(newGuru);
        this.logger.log(`Guru minimal #${saved.id} dibuat untuk User #${userId}`);
        await this.audit.log({
          actorId: actorId ?? null,
          action: 'GURU_AUTO_CREATE',
          resource: 'guru',
          resourceId: String(saved.id),
          summary: `Guru minimal dibuat otomatis: User #${userId} (${email}) tidak ada rekaman Guru`,
          details: { guruId: saved.id, userId, email },
        });
      } catch (err: any) {
        // Race condition unique constraint — idempoten, skip
        if (err?.code === '23505') {
          this.logger.warn(`linkUserToGuru: constraint race untuk User #${userId}, skip`);
        } else {
          throw err;
        }
      }
    }
  }

  /**
   * linkGuruToUser — panggil saat data Guru baru dibuat/diimpor.
   * Cari user dengan email yang sama, jika ada dan belum tertaut → tautkan.
   */
  async linkGuruToUser(guruId: number, actorId?: number): Promise<void> {
    const guru = await this.guruRepo.findOne({ where: { id: guruId } });
    if (!guru || !guru.email) return;

    const email = guru.email.toLowerCase().trim();

    const user = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email })
      .andWhere('u.roles @> :role', { role: JSON.stringify(['guru']) })
      .andWhere("u.status = 'active'")
      .getOne();

    if (!user) return;

    if (guru.userId != null && guru.userId !== user.id) {
      this.logger.warn(
        `Konflik: Guru #${guruId} sudah tertaut userId=${guru.userId}, tidak timpa ke ${user.id}`,
      );
      await this.audit.log({
        actorId: actorId ?? null,
        action: 'GURU_LINK_CONFLICT',
        resource: 'guru',
        resourceId: String(guruId),
        summary: `Konflik: Guru #${guruId} sudah tertaut ke userId=${guru.userId}, tidak ditimpa ke userId=${user.id}`,
        details: { existingUserId: guru.userId, incomingUserId: user.id },
      });
      return;
    }

    if (guru.userId === user.id) return; // idempoten

    guru.userId = user.id;
    await this.guruRepo.save(guru);
    this.logger.log(`Link Guru #${guruId} ← User #${user.id} (${email})`);
    await this.audit.log({
      actorId: actorId ?? null,
      action: 'GURU_LINK',
      resource: 'guru',
      resourceId: String(guruId),
      summary: `Tautan otomatis: Guru #${guruId} ← user ${email} (userId=${user.id})`,
      details: { guruId, userId: user.id },
    });
  }

  /**
   * backfillAll — jalankan via endpoint admin.
   * Idempoten: jalan 2× → run ke-2 menghasilkan linked:0, created:0.
   *
   * Fase 1: Guru yg punya email tapi userId=null → jodohkan by email ke User.
   * Fase 2: User guru aktif yg sama sekali tidak punya record Guru
   *         (by userId maupun by email) → buat Guru minimal lalu tautkan.
   */
  async backfillAll(
    actorId?: number,
  ): Promise<{ linked: number; created: number; conflicts: number }> {
    let linked = 0;
    let created = 0;
    let conflicts = 0;

    // ── Fase 1: Guru dgn email != null & userId = null → jodohkan ─────────
    const unlinkedGuru = await this.guruRepo
      .createQueryBuilder('g')
      .where('g.email IS NOT NULL')
      .andWhere('g.userId IS NULL')
      .getMany();

    for (const guru of unlinkedGuru) {
      const email = guru.email!.toLowerCase().trim();
      const user = await this.userRepo
        .createQueryBuilder('u')
        .where('LOWER(u.email) = :email', { email })
        .andWhere('u.roles @> :role', { role: JSON.stringify(['guru']) })
        .andWhere("u.status = 'active'")
        .getOne();

      if (!user) continue;

      // Pastikan user ini belum tertaut ke Guru lain
      const takenByOther = await this.guruRepo.findOne({ where: { userId: user.id } });
      if (takenByOther && takenByOther.id !== guru.id) {
        conflicts++;
        this.logger.warn(
          `Backfill F1 konflik: User #${user.id} sudah tertaut Guru #${takenByOther.id}, skip Guru #${guru.id}`,
        );
        continue;
      }

      guru.userId = user.id;
      await this.guruRepo.save(guru);
      linked++;
      this.logger.log(`Backfill F1: Guru #${guru.id} (${guru.nama}) → User #${user.id}`);
    }

    // ── Fase 2: User guru aktif tanpa record Guru apapun → buat minimal ───
    const allGuruUsers = await this.userRepo
      .createQueryBuilder('u')
      .where('u.roles @> :role', { role: JSON.stringify(['guru']) })
      .andWhere("u.status = 'active'")
      .getMany();

    for (const user of allGuruUsers) {
      const email = user.email.toLowerCase().trim();

      // Cari Guru yg sudah tertaut via userId ATAU cocok email
      const existing = await this.guruRepo
        .createQueryBuilder('g')
        .where('g.userId = :uid', { uid: user.id })
        .orWhere('LOWER(g.email) = :email', { email })
        .getOne();

      if (existing) {
        // Guru ada tapi userId-nya masih null (mis. Fase 1 tidak menemukan user karena role baru ditambah)
        if (existing.userId == null) {
          // Pastikan tidak konflik
          const takenByOther = await this.guruRepo.findOne({ where: { userId: user.id } });
          if (takenByOther && takenByOther.id !== existing.id) {
            conflicts++;
            continue;
          }
          existing.userId = user.id;
          if (!existing.email) existing.email = email;
          await this.guruRepo.save(existing);
          linked++;
          this.logger.log(
            `Backfill F2 link existing: Guru #${existing.id} → User #${user.id}`,
          );
        }
        continue; // sudah selesai untuk user ini
      }

      // Benar-benar tidak ada Guru → buat minimal
      this.logger.log(`Backfill F2: buat Guru minimal untuk User #${user.id} (${email})`);
      try {
        const newGuru = this.guruRepo.create({
          nama: user.name,
          email,
          jenisKelamin: 'L',   // placeholder — harus diisi admin
          status: 'aktif',
          fotoUrl: '',
          userId: user.id,
          nip: null,
          telepon: null,
          faceEmbeddings: null,
          faceStatus: 'BELUM',
        });
        const saved = await this.guruRepo.save(newGuru);
        created++;
        this.logger.log(`Backfill F2: Guru minimal #${saved.id} untuk User #${user.id}`);
        await this.audit.log({
          actorId: actorId ?? null,
          action: 'GURU_AUTO_CREATE',
          resource: 'guru',
          resourceId: String(saved.id),
          summary: `Backfill: Guru minimal dibuat untuk User #${user.id} (${email})`,
          details: { guruId: saved.id, userId: user.id, email },
        });
      } catch (err: any) {
        if (err?.code === '23505') {
          // Race unique constraint — idempoten, tidak error
          conflicts++;
          this.logger.warn(
            `Backfill F2 constraint race User #${user.id}: ${err.detail ?? err.message}`,
          );
        } else {
          throw err;
        }
      }
    }

    const summary = `Backfill Guru-User selesai: linked=${linked}, created=${created}, conflicts=${conflicts}`;
    this.logger.log(summary);
    await this.audit.log({
      actorId: actorId ?? null,
      action: 'GURU_BACKFILL',
      resource: 'guru',
      resourceId: '-',
      summary,
      details: { linked, created, conflicts },
    });

    return { linked, created, conflicts };
  }
}
