import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import { GuruLinkService } from '../guru/guru-link.service';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, CurrentSession } from '../common/current-user.decorator';
import { getIpAddress, getDeviceSummary } from '../common/device.util';
import { User } from './user.entity';
import { Session } from '../sessions/session.entity';
import {
  IsString,
  IsEmail,
  MinLength,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  roles: string[];
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}

class ApproveUserDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  roles: string[];
}

@Controller('api/admin/users')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private sessionsService: SessionsService,
    private auditService: AuditService,
    private guruLinkService: GuruLinkService,
  ) {}

  @Get()
  async findAll(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAllPaginated({
      q: q || undefined,
      status: status || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('pending')
  async findPending() {
    const users = await this.usersService.findPending();
    return users.map((u) => this.usersService.toAdminUser(u));
  }

  @Get('pending/count')
  async countPending() {
    const count = await this.usersService.countPending();
    return { count };
  }

  @Post()
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: User,
    @CurrentSession() session: Session,
  ) {
    const user = await this.usersService.create(dto);
    await this.auditService.record({
      user: currentUser,
      action: 'create',
      entity: 'user',
      entityId: String(user.id),
      entityLabel: `${user.name} (${user.email})`,
      summary: `Membuat akun ${user.name} dengan peran [${user.roles.join(', ')}]`,
      ipAddress: session.ipAddress,
      deviceSummary: session.deviceSummary,
    });
    // Link otomatis jika akun baru punya role guru
    if (user.roles.includes('guru')) {
      await this.guruLinkService.linkUserToGuru(user.id, currentUser.id).catch(() => void 0);
    }
    return this.usersService.toAdminUser(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(parseInt(id, 10));
    if (!user) throw new BadRequestException('Akun tidak ditemukan');
    const sessions = await this.sessionsService.listActiveByUser(user.id);
    return {
      ...this.usersService.toAdminUser(user),
      sessions: sessions.map((s) => ({
        id: s.id,
        deviceSummary: s.deviceSummary,
        ipAddress: s.ipAddress,
        loginMethod: s.loginMethod,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
      })),
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: User,
    @CurrentSession() session: Session,
  ) {
    const user = await this.usersService.update(
      parseInt(id, 10),
      dto,
      currentUser.id,
    );
    await this.auditService.record({
      user: currentUser,
      action: 'update',
      entity: 'user',
      entityId: String(user.id),
      entityLabel: `${user.name} (${user.email})`,
      summary: `Mengubah akun ${user.name}`,
      ipAddress: session.ipAddress,
      deviceSummary: session.deviceSummary,
    });
    return this.usersService.toAdminUser(user);
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveUserDto,
    @CurrentUser() currentUser: User,
    @CurrentSession() session: Session,
  ) {
    const user = await this.usersService.approve(parseInt(id, 10), dto.roles);
    await this.auditService.record({
      user: currentUser,
      action: 'approve',
      entity: 'user',
      entityId: String(user.id),
      entityLabel: `${user.name} (${user.email})`,
      summary: `Menyetujui pendaftar ${user.name} dengan peran [${user.roles.join(', ')}]`,
      ipAddress: session.ipAddress,
      deviceSummary: session.deviceSummary,
    });
    // Link otomatis bila role guru di-approve
    if (user.roles.includes('guru')) {
      await this.guruLinkService.linkUserToGuru(user.id, currentUser.id).catch(() => void 0);
    }
    return this.usersService.toAdminUser(user);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
    @CurrentSession() session: Session,
  ) {
    const target = await this.usersService.findById(parseInt(id, 10));
    const label = target ? `${target.name} (${target.email})` : `ID ${id}`;
    await this.usersService.delete(parseInt(id, 10), currentUser.id);
    // revoke all sessions for deleted user
    if (target) {
      await this.sessionsService.revokeAllByUser(target.id);
    }
    await this.auditService.record({
      user: currentUser,
      action: 'delete',
      entity: 'user',
      entityId: id,
      entityLabel: label,
      summary: `Menghapus akun ${label}`,
      ipAddress: session.ipAddress,
      deviceSummary: session.deviceSummary,
    });
    return { message: 'Akun berhasil dihapus' };
  }
}
