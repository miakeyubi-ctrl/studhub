import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Reservations')
@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.ADMIN)
@ApiBearerAuth('JWT-AUTH')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Mes demandes de réservation' })
  mine(@CurrentUser() user: JwtPayload) {
    return this.reservations.mine(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Demander la réservation d’un logement' })
  create(@CurrentUser() user: JwtPayload, @Body() body: { propertyId?: number }) {
    return this.reservations.create(user.sub, Number(body?.propertyId));
  }
}
