import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OtpService } from '../../common/otp/otp.service';
import { TwilioSmsService } from '../../common/sms/twilio-sms.service';
import { EmailService } from '../../common/email/email.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: cfg.get('JWT_ACCESS_TTL', '15m'),
          issuer: cfg.get('JWT_ISSUER', 'studhub.tn'),
          audience: cfg.get('JWT_AUDIENCE', 'studhub-api'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TwilioSmsService, EmailService, OptionalJwtAuthGuard],
  exports: [AuthService, JwtModule, OtpService, TwilioSmsService, EmailService, OptionalJwtAuthGuard],
})
export class AuthModule {}
