import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pengaturan } from './pengaturan.entity';
import { AuditService } from '../audit/audit.service';
import { User } from '../users/user.entity';
import { Request } from 'express';

/**
 * T11-FIX Ronde 2 (Butir 4): key yang tersedia hanya 4.
 * 'tahun_ajaran_aktif' sudah DIHAPUS — sumber kebenaran tunggal
 * = kolom `aktif` di entitas tahun_ajaran.
 */
export type PengaturanKey =
  | 'profil_sekolah'
  | 'jam_presensi'
  | 'lokasi'
  | 'kkm'
  | 'wajah';

/**
 * Deep-merge untuk object value (skip array — replace).
 */
function deepMerge(target: any, source: any): any {
  if (target == null) return source;
  if (source == null) return target;
  const out: any = Array.isArray(target) ? [...target] : { ...target };
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = target[k];
    if (
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      out[k] = deepMerge(tv, sv);
    } else if (sv !== undefined) {
      out[k] = sv;
    }
  }
  return out;
}

function deepClone(v: any): any {
  if (v == null) return v;
  if (typeof v !== 'object') return v;
  return JSON.parse(JSON.stringify(v));
}

@Injectable()
export class PengaturanService {
  constructor(
    @InjectRepository(Pengaturan)
    private readonly repo: Repository<Pengaturan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  // T15 0b: In-process cache TTL 60 dtk untuk data panas (§12.16d)
  private pengaturanCache = new Map<string, { value: any; ts: number }>();
  private static CACHE_TTL_MS = 60_000;

  private cacheGet(key: string): any | null {
    const entry = this.pengaturanCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > PengaturanService.CACHE_TTL_MS) {
      this.pengaturanCache.delete(key);
      return null;
    }
    return deepClone(entry.value);
  }

  private cacheSet(key: string, value: any): void {
    this.pengaturanCache.set(key, { value: deepClone(value), ts: Date.now() });
  }

  private cacheInvalidate(key?: string): void {
    if (key) {
      this.pengaturanCache.delete(key);
    } else {
      this.pengaturanCache.clear();
    }
  }

  async listAll() {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  async getOne(key: string) {
    // T15 0b: cek cache dulu
    const cached = this.cacheGet(key);
    if (cached) return cached;
    const row = await this.repo.findOne({ where: { key } });
    if (!row) throw new NotFoundException(`Pengaturan '${key}' tidak ditemukan`);
    this.cacheSet(key, row);
    return row;
  }

  /**
   * T11-FIX Ronde 2 (Butir 4): PATCH /api/admin/pengaturan/:key
   * Deep-merge untuk object value (parsial). Primitive atau salah
   * satu bukan object → replace. Audit before/after untuk trace.
   */
  async upsert(key: string, value: any, req: Request) {
    const existing = await this.repo.findOne({ where: { key } });
    const before = existing ? deepClone(existing.value) : null;

    // Fetch user name for updatedByName (T14 arahan #4)
    const userId = req.session?.userId ?? null;
    let updatedByName: string | null = null;
    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      updatedByName = user?.name ?? null;
    }

    let nextValue: any = value;
    const isObj = (v: any) =>
      v !== null && typeof v === 'object' && !Array.isArray(v);

    if (existing && isObj(existing.value) && isObj(value)) {
      nextValue = deepMerge(deepClone(existing.value), value);
    }

    const row = this.repo.create({ key, value: nextValue });
    row.updatedByName = updatedByName;
    const saved = await this.repo.save(row);
    // T15 0b: invalidasi cache setelah mutasi
    this.cacheInvalidate(key);

    await this.audit.log({
      actorId: userId,
      action: existing ? 'UPDATE_PENGATURAN' : 'CREATE_PENGATURAN',
      resource: 'pengaturan',
      resourceId: key,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: existing
        ? `Memperbarui pengaturan ${key}`
        : `Membuat pengaturan ${key}`,
      details: { before, after: nextValue },
    });

    return saved;
  }

  /**
   * Inisialisasi default row untuk §14.10.1 jika tabel kosong.
   * Struktur value persis sesuai spec — 4 key saja (tanpa tahun_ajaran_aktif).
   */
  async seedDefaults() {
    const count = await this.repo.count();
    if (count > 0) return;

    const defaults: Array<{ key: string; value: any }> = [
      {
        key: 'profil_sekolah',
        value: {
          nama: 'SMP IT Asy-Syadzili',
          jenjang: '',
          logoUrl: '',
          kepsekNama: '',
          kepsekNip: '',
          kepsekJabatan: 'Kepala Sekolah',
          alamat: '',
          kabKota: '',
        },
      },
      {
        key: 'jam_presensi',
        value: {
          jamMasuk: '06:30',
          jamPulang: '15:00',
          toleransiMenit: 15,
          cutoff: '15:00',
        },
      },
      {
        key: 'lokasi',
        value: {
          aktif: false,
          lat: 0,
          lng: 0,
          radiusMeter: 100,
        },
      },
      {
        key: 'kkm',
        value: {
          nilai: 75,
        },
      },
      {
        // F3a: konfigurasi pengenalan wajah guru
        // F3b: tambah margin utk disambiguasi 1:N kiosk
        key: 'wajah',
        value: {
          threshold: 0.6,
          minPoses: 3,
          margin: 0.05,
        },
      },
    ];

    for (const d of defaults) {
      await this.repo.save(this.repo.create(d));
    }
  }
}
