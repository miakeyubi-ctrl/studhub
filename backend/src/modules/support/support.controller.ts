import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EmailService } from '../../common/email/email.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('contact')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer un message au support StudHub par e-mail' })
  async contact(
    @CurrentUser() user: JwtPayload,
    @Body() body: { subject?: string; message?: string },
  ) {
    const subject = String(body?.subject || '').trim();
    const message = String(body?.message || '').trim();
    if (subject.length < 3 || message.length < 10) {
      throw new BadRequestException('Sujet et message requis');
    }

    let fromEmail = '';
    let fromName = '';
    if (user.type === 'user') {
      const u = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { email: true, fullName: true },
      });
      fromEmail = u?.email || '';
      fromName = u?.fullName || '';
    } else if (user.type === 'agent') {
      const a = await this.prisma.agent.findUnique({
        where: { id: user.sub },
        select: { email: true, agencyName: true },
      });
      fromEmail = a?.email || '';
      fromName = a?.agencyName || '';
    }

    if (!fromEmail) {
      throw new BadRequestException('Compte sans e-mail');
    }

    const delivery = await this.email.sendSupportMessage({
      fromEmail,
      fromName,
      subject,
      message,
    });

    if (!delivery.delivered) {
      throw new ServiceUnavailableException(
        delivery.error || "Impossible d'envoyer le message pour le moment",
      );
    }

    return {
      sent: true,
      delivery: delivery.via,
    };
  }
}
