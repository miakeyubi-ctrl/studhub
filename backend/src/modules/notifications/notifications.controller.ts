import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-AUTH')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Historique de mes notifications' })
  list(@CurrentUser() user: JwtPayload) {
    return this.notifications.list(user);
  }

  @Post()
  @ApiOperation({ summary: 'Enregistrer une notification' })
  create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.notifications.create(user, body);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  markAll(@CurrentUser() user: JwtPayload) {
    return this.notifications.markAllRead(user);
  }

  @Post('read-route')
  @ApiOperation({ summary: 'Marquer lues les notifications d’un écran' })
  markRoute(@CurrentUser() user: JwtPayload, @Body() body: { route?: string }) {
    return this.notifications.markRouteRead(user, String(body?.route || ''));
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  markRead(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.markRead(user, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une notification' })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.remove(user, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Vider l’historique de notifications' })
  clear(@CurrentUser() user: JwtPayload) {
    return this.notifications.clear(user);
  }
}
