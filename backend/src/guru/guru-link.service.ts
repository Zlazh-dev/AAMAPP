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
 * - UsersService.approve()  → user role-guru disetujui
 * - AuthService.loginGoogle() / registerGoogle() (saat user dibuat role guru)
 * - GuruService.create()    → data guru baru dibuat
 * - ImportService.commit()  → data guru diimpor dari Excel
 * - SeedService.backfill()  → idempoten backfill saat boot dev
 *
 * Kontrak:
 * 1. Cari Guru.email == user.email (ilike) → set Guru.userId = user.id
 * 2. Bila Guru tidak ada tapi akun punya role guru → buat Guru minimal
 *    dengan profileComplete = false (belum ada di entity, gunakan fotoUrl khusus)
 * 3. Tidak pernah menimpa Guru.userId yang sudah terisi ke akun LAIN
 *    (konflik) — catat konflik ke audit, jangan override diam-diam
 * 4. Role dicabut → tautan & data DIBIARKAN (prinsip: data biometrik &
 *    riwayat presensi tidak boleh hilang karena deaktivasi akun)
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
   * atau saat user Google baru masuk dengan role guru.
   *
   * @param userId  ID user yang baru di-approve/dibuat
   * @param actorId ID admin yang melakukan aksi (untuk audit)
   */
  async linkUserToGuru(userId: number, actorId?: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;
    if (!user.roles.includes('guru')) return; // tidak relevan

    const email = user.email.toLowerCase().trim();

    // Cari Guru by email
    const guru = await this.guruRepo
      .createQueryBuilder('g')
      .where('LOWER(g.email) = :email', { email })
      .getOne();

    if (guru) {
      // Cek konflik: sudah tertaut ke akun LAIN
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

      if (guru.userId === userId) return; // sudah tertaut, idempoten

      // Tautkan
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
      const newGuru = this.guruRepo.create({
        nama: user.name,
        email,
        jenisKelamin: 'L', // placeholder — harus dilengkapi
        status: 'aktif',
        fotoUrl: '', // kosong = profil belum lengkap
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
    }
  }

  /**
   * linkGuruToUser — panggil saat data Guru baru dibuat/diimpor.
   * Cari user dengan email yang sama, jika ada dan belum tertaut → tautkan.
   *
   * @param guruId   ID guru yang baru dibuat
   * @param actorId  ID admin (untuk audit)
   */
  async linkGuruToUser(guruId: number, actorId?: number): Promise<void> {
    const guru = await this.guruRepo.findOne({ where: { id: guruId } });
    if (!guru || !guru.email) return;

    const email = guru.email.toLowerCase().trim();

    // Cari user aktif dengan role guru
    const user = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email })
      .andWhere("u.roles @> :role", { role: JSON.stringify(['guru']) })
      .andWhere("u.status = 'active'")
      .getOne();

    if (!user) return; // tidak ada akun cocok

    // Cek konflik: Guru sudah tertaut ke akun lain
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

    if (guru.userId === user.id) return; // sudah benar, idempoten

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
   * backfillAll — jalankan sekali waktu boot (dev/staging) atau via endpoint admin.
   * Idempoten: hanya mengisi yang kosong / tidak konflik.
   * Tidak pernah membuat Guru baru (hanya menautkan).
   */
  async backfillAll(actorId?: number): Promise<{ linked: number; conflicts: number }> {
    let linked = 0;
    let conflicts = 0;

    // Semua guru yang punya email tapi belum tertaut
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
        .andWhere("u.roles @> :role", { role: JSON.stringify(['guru']) })
        .andWhere("u.status = 'active'")
        .getOne();

      if (!user) continue;

      guru.userId = user.id;
      await this.guruRepo.save(guru);
      linked++;
      this.logger.log(`Backfill: Guru #${guru.id} → User #${user.id}`);
    }

    // Semua user guru aktif yang belum punya Guru record
    const guruUsers = await this.userRepo
      .createQueryBuilder('u')
      .where("u.roles @> :role", { role: JSON.stringify(['guru']) })
      .andWhere("u.status = 'active'")
      .getMany();

    for (const user of guruUsers) {
      const email = user.email.toLowerCase().trim();
      const existing = await this.guruRepo
        .createQueryBuilder('g')
        .where('g.userId = :uid OR LOWER(g.email) = :email', {
          uid: user.id,
          email,
        })
        .getOne();

      if (existing) continue; // sudah tertaut atau ada data

      // Tidak otomatis buat Guru minimal di backfill — itu dilakukan saat approve
    }

    if (actorId) {
      await this.audit.log({
        actorId,
        action: 'GURU_BACKFILL',
        resource: 'guru',
        resourceId: '-',
        summary: `Backfill Guru-User selesai: linked=${linked}, conflicts=${conflicts}`,
        details: { linked, conflicts },
      });
    }

    return { linked, conflicts };
  }
}
