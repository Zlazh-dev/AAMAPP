import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';

const VALID_ROLES = ['admin', 'guru', 'kurikulum', 'kesiswaan', 'tu', 'kepsek'];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  toSafeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      status: user.status,
      hasPassword: !!user.passwordHash,
      googleLinked: !!user.googleSub,
    };
  }

  toAdminUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      status: user.status,
      requestedRoles: user.requestedRoles,
      registrationNote: user.registrationNote,
      googleLinked: !!user.googleSub,
      createdAt: user.createdAt,
    };
  }

  validateRoles(roles: string[]): void {
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new BadRequestException('Minimal harus ada satu peran');
    }
    for (const r of roles) {
      if (!VALID_ROLES.includes(r)) {
        throw new BadRequestException(`Peran tidak valid: ${r}`);
      }
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByIdWithPassword(id: number): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id })
      .getOne();
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { createdAt: 'ASC' } });
  }

  /**
   * T15 0b: Paginated user list with server-side filtering (§12.16a).
   * DILARANG find() tanpa where/take pada tabel yang datanya bertumbuh.
   */
  async findAllPaginated(params: {
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.q) {
      // ILike search on name OR email
      // TypeORM doesn't support OR on same field in findAndCount easily, use QB
    }
    const qb = this.userRepo
      .createQueryBuilder('u')
      .orderBy('u.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    if (params.q) {
      qb.andWhere(
        '(LOWER(u.name) LIKE :q OR LOWER(u.email) LIKE :q)',
        { q: `%${params.q.toLowerCase()}%` },
      );
    }
    if (params.status) {
      qb.andWhere('u.status = :status', { status: params.status });
    }
    const [rows, total] = await qb.getManyAndCount();
    const data = rows.map((u) => this.toAdminUser(u));
    return { data, total, page, limit };
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    roles: string[];
  }): Promise<User> {
    this.validateRoles(data.roles);
    if (data.name.trim().length < 3) {
      throw new BadRequestException('Nama minimal 3 karakter');
    }
    if (data.password.length < 8) {
      throw new BadRequestException('Password minimal 8 karakter');
    }

    const email = data.email.toLowerCase().trim();
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.userRepo.create({
      name: data.name.trim(),
      email,
      passwordHash,
      roles: data.roles,
      status: 'active',
      requestedRoles: [],
      registrationNote: null,
    });
    return this.userRepo.save(user);
  }

  async update(
    id: number,
    data: {
      name?: string;
      email?: string;
      password?: string;
      roles?: string[];
    },
    currentUserId?: number,
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Akun tidak ditemukan');

    if (data.name !== undefined) {
      if (data.name.trim().length < 3) {
        throw new BadRequestException('Nama minimal 3 karakter');
      }
      user.name = data.name.trim();
    }

    if (data.email !== undefined) {
      const email = data.email.toLowerCase().trim();
      const existing = await this.userRepo
        .createQueryBuilder('u')
        .where('u.email = :email', { email })
        .andWhere('u.id != :id', { id })
        .getOne();
      if (existing) {
        throw new ConflictException('Email sudah terdaftar');
      }
      user.email = email;
    }

    if (data.password !== undefined && data.password.length > 0) {
      if (data.password.length < 8) {
        throw new BadRequestException('Password minimal 8 karakter');
      }
      user.passwordHash = await bcrypt.hash(data.password, 10);
    }

    if (data.roles !== undefined) {
      this.validateRoles(data.roles);

      // cek: tidak boleh menghapus peran admin dari admin aktif terakhir
      if (
        user.roles.includes('admin') &&
        !data.roles.includes('admin') &&
        user.status === 'active'
      ) {
        const adminCount = await this.userRepo
          .createQueryBuilder('u')
          .where('u.roles @> :adminRole', { adminRole: JSON.stringify(['admin']) })
          .andWhere('u.status = :status', { status: 'active' })
          .andWhere('u.id != :id', { id })
          .getCount();
        if (adminCount === 0) {
          throw new BadRequestException(
            'Minimal harus ada satu akun admin aktif',
          );
        }
      }
      user.roles = data.roles;
    }

    return this.userRepo.save(user);
  }

  async approve(id: number, roles: string[]): Promise<User> {
    this.validateRoles(roles);
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Akun tidak ditemukan');
    if (user.status !== 'pending') {
      throw new BadRequestException('Akun ini tidak dalam status pending');
    }
    user.status = 'active';
    user.roles = roles;
    return this.userRepo.save(user);
  }

  async delete(id: number, currentUserId: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Akun tidak ditemukan');

    if (id === currentUserId) {
      throw new BadRequestException('Anda tidak dapat menghapus akun sendiri');
    }

    // cek admin aktif terakhir
    if (user.roles.includes('admin') && user.status === 'active') {
      const adminCount = await this.userRepo
        .createQueryBuilder('u')
        .where('u.roles @> :adminRole', { adminRole: JSON.stringify(['admin']) })
        .andWhere('u.status = :status', { status: 'active' })
        .andWhere('u.id != :id', { id })
        .getCount();
      if (adminCount === 0) {
        throw new BadRequestException(
          'Minimal harus ada satu akun admin aktif',
        );
      }
    }

    await this.userRepo.delete(id);
  }

  async countPending(): Promise<number> {
    return this.userRepo
      .createQueryBuilder('u')
      .where('u.status = :status', { status: 'pending' })
      .getCount();
  }

  async findPending(): Promise<User[]> {
    return this.userRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }
}
