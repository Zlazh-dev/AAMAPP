import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, CurrentSession } from '../common/current-user.decorator';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';

@Controller('api/admin/sessions')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSessionsController {
  constructor(
    private sessionsService: SessionsService,
    private auditService: AuditService,
  ) {}

  @Get()
  async listAll(
    @CurrentUser() currentUser: User,
    @CurrentSession() currentSession: Session,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.sessionsService.listAllActivePaginated({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    // Mark current session
    const data = result.data.map((s: any) => ({
      ...s,
      current: s.id === currentSession.id,
    }));
    return { ...result, data };
  }

  @Delete(':id')
  async revoke(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
    @CurrentSession() currentSession: Session,
  ) {
    await this.sessionsService.revokeById(parseInt(id, 10));
    await this.auditService.record({
      user: currentUser,
      action: 'revoke',
      entity: 'session',
      entityId: id,
      summary: `Mencabut sesi #${id}`,
      ipAddress: currentSession.ipAddress,
      deviceSummary: currentSession.deviceSummary,
    });
    return { message: 'Sesi berhasil dicabut' };
  }
}
