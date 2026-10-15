import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

class RegisterPushDto {
  @IsString()
  @MinLength(10)
  token!: string;

  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform!: string;
}

class UnregisterPushDto {
  @IsString()
  @MinLength(10)
  token!: string;
}

@ApiTags('Push')
@Controller('push')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-AUTH')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('register')
  register(@CurrentUser() u: JwtPayload, @Body() body: RegisterPushDto) {
    const subject = { type: u.type as 'user' | 'agent', id: u.sub };
    return this.push.registerToken(subject, body.token, body.platform);
  }

  @Delete('unregister')
  unregister(@Body() body: UnregisterPushDto) {
    return this.push.unregisterToken(body.token);
  }
}
