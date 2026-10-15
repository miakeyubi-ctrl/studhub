import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type EmailDelivery = 'smtp' | 'resend' | 'console';

export interface SendEmailResult {
  delivered: boolean;
  via: EmailDelivery;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly resendApiKey: string | null;

  constructor(private readonly cfg: ConfigService) {
    this.resendApiKey = this.cfg.get<string>('RESEND_API_KEY')?.trim() || null;

    if (this.hasSmtpConfig()) {
      try {
        const port = Number(this.cfg.get('SMTP_PORT') || 465);
        const secureRaw = (this.cfg.get<string>('SMTP_SECURE') || '').toLowerCase();
        const secure = secureRaw === 'true' || (!secureRaw && port === 465);
        this.transporter = nodemailer.createTransport({
          host: this.cfg.get<string>('SMTP_HOST')!.trim(),
          port,
          secure,
          auth: {
            user: this.cfg.get<string>('SMTP_USER')!.trim(),
            pass: this.cfg.get<string>('SMTP_PASS')!.trim(),
          },
        });
        this.logger.log(`SMTP prêt (${this.cfg.get('SMTP_HOST')}:${port})`);
      } catch (e) {
        this.logger.warn(`SMTP init failed: ${(e as Error)?.message}`);
        this.transporter = null;
      }
    } else if (this.resendApiKey) {
      this.logger.log('Resend API prêt (pas de SMTP)');
    } else {
      this.logger.warn('Aucun transporteur e-mail (SMTP / RESEND_API_KEY) — mode console');
    }
  }

  private hasSmtpConfig(): boolean {
    const host = this.cfg.get<string>('SMTP_HOST')?.trim();
    const user = this.cfg.get<string>('SMTP_USER')?.trim();
    const pass = this.cfg.get<string>('SMTP_PASS')?.trim();
    return !!(host && user && pass && pass !== 'CHANGE_ME');
  }

  isConfigured(): boolean {
    return !!this.transporter || !!this.resendApiKey;
  }

  private fromHeader(): { name: string; address: string } {
    return {
      name: this.cfg.get<string>('EMAIL_FROM_NAME') || 'StudHub',
      address: this.cfg.get<string>('EMAIL_FROM') || 'noreply@studhub.tn',
    };
  }

  private allowConsoleFallback(): boolean {
    const force = (this.cfg.get<string>('EMAIL_CONSOLE_FALLBACK') || '').toLowerCase();
    if (force === 'true') return true;
    if (force === 'false') return false;
    return (process.env.NODE_ENV || 'development') !== 'production';
  }

  async sendMail(opts: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<SendEmailResult> {
    const to = opts.to.trim().toLowerCase();
    const from = this.fromHeader();

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"${from.name}" <${from.address}>`,
          to,
          subject: opts.subject,
          text: opts.text,
          html: opts.html,
        });
        this.logger.log(`[EMAIL SMTP] envoyé -> ${to}`);
        return { delivered: true, via: 'smtp' };
      } catch (e) {
        const msg = (e as Error)?.message || 'SMTP send failed';
        this.logger.error(`[EMAIL SMTP] échec -> ${to}: ${msg}`);
        if (this.resendApiKey) {
          return this.sendViaResend(to, from, opts);
        }
        return this.consoleOrFail(to, opts, msg);
      }
    }

    if (this.resendApiKey) {
      return this.sendViaResend(to, from, opts);
    }

    return this.consoleOrFail(to, opts, 'SMTP/Resend non configuré');
  }

  private async sendViaResend(
    to: string,
    from: { name: string; address: string },
    opts: { subject: string; text: string; html: string },
  ): Promise<SendEmailResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${from.name} <${from.address}>`,
          to: [to],
          subject: opts.subject,
          text: opts.text,
          html: opts.html,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const msg = `Resend HTTP ${res.status}: ${body.slice(0, 200)}`;
        this.logger.error(`[EMAIL RESEND] échec -> ${to}: ${msg}`);
        return this.consoleOrFail(to, opts, msg);
      }
      this.logger.log(`[EMAIL RESEND] envoyé -> ${to}`);
      return { delivered: true, via: 'resend' };
    } catch (e) {
      const msg = (e as Error)?.message || 'Resend send failed';
      this.logger.error(`[EMAIL RESEND] échec -> ${to}: ${msg}`);
      return this.consoleOrFail(to, opts, msg);
    }
  }

  private consoleOrFail(
    to: string,
    opts: { subject: string; text: string },
    error: string,
  ): SendEmailResult {
    if (this.allowConsoleFallback()) {
      this.logger.warn(`[EMAIL CONSOLE] ${opts.subject} → ${to}\n${opts.text}`);
      return { delivered: true, via: 'console' };
    }
    return { delivered: false, via: 'console', error };
  }

  async sendOtp(toEmail: string, code: string): Promise<SendEmailResult> {
    const subject = 'StudHub — Code de confirmation';
    const text =
      `StudHub — Code de confirmation : ${code}. Valide 10 min.\n\n` +
      `Si vous n'avez pas demandé ce code, ignorez cet e-mail.`;
    const html =
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">` +
      `<p style="font-size:18px;font-weight:700;color:#0f766e;margin:0 0 12px">StudHub</p>` +
      `<p style="font-size:15px;color:#334155;margin:0 0 8px">Votre code de confirmation :</p>` +
      `<p style="font-family:ui-monospace,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#0f766e;margin:16px 0">${code}</p>` +
      `<p style="font-size:13px;color:#64748b;margin:0">Valide 10 minutes. Ne partagez pas ce code.</p>` +
      `</div>`;

    return this.sendMail({ to: toEmail, subject, text, html });
  }

  async sendSupportMessage(params: {
    fromEmail: string;
    fromName?: string;
    subject: string;
    message: string;
  }): Promise<SendEmailResult> {
    const inbox =
      this.cfg.get<string>('SUPPORT_INBOX')?.trim() ||
      this.cfg.get<string>('EMAIL_FROM')?.trim() ||
      'support@studhub.tn';
    const subject = `[Support StudHub] ${params.subject.trim().slice(0, 120)}`;
    const text =
      `De: ${params.fromName || 'Utilisateur'} <${params.fromEmail}>\n\n` +
      `${params.message.trim()}`;
    const html =
      `<p style="font-family:sans-serif;font-size:14px;color:#334155">` +
      `<strong>De :</strong> ${escapeHtml(params.fromName || 'Utilisateur')} ` +
      `&lt;${escapeHtml(params.fromEmail)}&gt;</p>` +
      `<p style="font-family:sans-serif;font-size:15px;color:#0f172a;white-space:pre-wrap">${escapeHtml(params.message.trim())}</p>`;

    return this.sendMail({ to: inbox, subject, text, html });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
