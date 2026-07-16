import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ProfileService } from './profile.service';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { CurrentUser, CurrentSession } from '../common/current-user.decorator';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
import {
  IsString,
  IsOptional,
  MinLength,
} from 'class-validator';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;
}

class PasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

class LinkGoogleDto {
  @IsString()
  credential: string;
}

@Controller('api/profile')
@UseGuards(SessionAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user);
  }

  @Patch()
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: User,
  ) {
    const updated = await this.profileService.updateProfile(user, dto);
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      roles: updated.roles,
      status: updated.status,
      hasPassword: !!updated.passwordHash,
      googleLinked: !!updated.googleSub,
      createdAt: updated.createdAt,
    };
  }

  @Post('password')
  async changePassword(
    @Body() dto: PasswordDto,
    @CurrentUser() user: User,
    @CurrentSession() session: Session,
  ) {
    await this.profileService.changePassword(
      user,
      dto.currentPassword || null,
      dto.newPassword,
      session.id,
    );
    return { message: 'Password berhasil diubah. Sesi lain telah dicabut.' };
  }

  @Post('link-google')
  async linkGoogle(
    @Body() dto: LinkGoogleDto,
    @CurrentUser() user: User,
  ) {
    const updated = await this.profileService.linkGoogle(user, dto.credential);
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      roles: updated.roles,
      hasPassword: !!updated.passwordHash,
      googleLinked: !!updated.googleSub,
    };
  }

  @Delete('link-google')
  async unlinkGoogle(@CurrentUser() user: User) {
    const updated = await this.profileService.unlinkGoogle(user);
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      roles: updated.roles,
      hasPassword: !!updated.passwordHash,
      googleLinked: !!updated.googleSub,
    };
  }

  @Get('sessions')
  async ownSessions(
    @CurrentUser() user: User,
    @CurrentSession() session: Session,
  ) {
    const sessions = await this.profileService.getOwnSessions(user.id);
    return sessions.map((s) => ({
      id: s.id,
      deviceSummary: s.deviceSummary,
      ipAddress: s.ipAddress,
      loginMethod: s.loginMethod,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      current: s.id === session.id,
    }));
  }

  @Delete('sessions/:id')
  async revokeOwnSession(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    await this.profileService.revokeOwnSession(parseInt(id, 10), user.id);
    return { message: 'Sesi berhasil dicabut' };
  }
}
