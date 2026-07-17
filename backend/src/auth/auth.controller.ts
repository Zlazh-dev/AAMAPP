import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { Public } from '../common/public.decorator';
import { CurrentUser, CurrentSession } from '../common/current-user.decorator';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
import {
  IsEmail,
  IsString,
  IsArray,
  ArrayMinSize,
  IsBoolean,
  IsOptional,
} from 'class-validator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class GoogleLoginDto {
  @IsString()
  credential: string;
}

class RegisterGoogleDto {
  @IsString()
  credential: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  requestedRoles: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsBoolean()
  deviceConsent: boolean;
}

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Get('config')
  @Public()
  getConfig() {
    return { googleClientId: this.authService.getGoogleClientId() };
  }

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, req);
  }

  @Post('google')
  @Public()
  async google(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    return this.authService.loginGoogle(dto.credential, req);
  }

  @Post('register-google')
  @Public()
  async registerGoogle(@Body() dto: RegisterGoogleDto, @Req() req: Request) {
    const result = await this.authService.registerGoogle(
      dto.credential,
      dto.requestedRoles,
      dto.note || null,
      dto.deviceConsent,
      req,
    );
    return result;
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(@CurrentUser() user: User) {
    // Reload with passwordHash to properly set hasPassword
    const fullUser = await this.usersService.findByIdWithPassword(user.id);
    return this.usersService.toSafeUser(fullUser || user);
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  async logout(
    @CurrentSession() session: Session,
    @CurrentUser() user: User,
  ) {
    await this.authService.logout(session.id, user);
    return { message: 'Berhasil keluar' };
  }
}
