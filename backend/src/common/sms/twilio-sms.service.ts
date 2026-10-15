import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { maskPhone } from '../phone/phone.util';

export type SmsDelivery = 'twilio' | 'console';

@Injectable()
export class TwilioSmsService {
  private readonly logger = new Logger(TwilioSmsService.name);
  private client: ReturnType<typeof twilio> | null = null;

  constructor(private readonly cfg: ConfigService) {
    const sid = this.cfg.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const token = this.cfg.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    if (sid && token) {
      try {
        this.client = twilio(sid, token);
      } catch (e) {
        this.logger.warn(`Twilio client init failed: ${(e as Error)?.message}`);
        this.client = null;
      }
    }
  }

  isConfigured(): boolean {
    const from = this.cfg.get<string>('TWILIO_FROM_NUMBER')?.trim();
    const enabled = (this.cfg.get<string>('TWILIO_ENABLED') || 'true').toLowerCase() !== 'false';
    return enabled && !!this.client && !!from;
  }

  async sendOtp(toE164: string, code: string): Promise<{ delivered: boolean; via: SmsDelivery; error?: string }> {
    const template =
      this.cfg.get<string>('OTP_SMS_TEMPLATE') ||
      'StudHub — Code de confirmation : {{code}}. Valide 10 min.';
    const body = template.replace('{{code}}', code);
    const isProd = process.env.NODE_ENV === 'production';

    if (!this.isConfigured()) {
      if (isProd) {
        throw new ServiceUnavailableException('Envoi SMS non configure (Twilio)');
      }
      this.logger.log(`[SMS DEV] -> ${maskPhone(toE164)} | ${body}`);
      return { delivered: true, via: 'console' };
    }

    const from = this.cfg.get<string>('TWILIO_FROM_NUMBER')!.trim();
    try {
      await this.client!.messages.create({ to: toE164, from, body });
      this.logger.log(`[SMS Twilio] envoye -> ${maskPhone(toE164)}`);
      return { delivered: true, via: 'twilio' };
    } catch (e) {
      const msg = (e as Error)?.message || 'Twilio send failed';
      this.logger.error(`[SMS Twilio] echec -> ${maskPhone(toE164)}: ${msg}`);
      if (isProd) {
        throw new ServiceUnavailableException("Impossible d'envoyer le SMS. Reessayez plus tard.");
      }
      // En dev : ne pas faire croire que le SMS est parti
      throw new ServiceUnavailableException(
        msg.includes('verified recipient')
          ? "Twilio trial : ajoutez ce numéro dans Verified Caller IDs (console Twilio), puis réessayez."
          : `SMS Twilio échoué : ${msg}`,
      );
    }
  }
}
