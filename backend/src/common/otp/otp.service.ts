import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type OtpPurpose = 'register' | 'reset-password' | 'verify-email';

interface InMemoryOtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

/**
 * Service OTP StudHub : génère / stocke / vérifie des codes 6 chiffres.
 * Clé = purpose + identifier (téléphone E.164 ou email).
 * Redis préféré, Map en fallback.
 */
@Injectable()
export class OtpService implements OnModuleDestroy {
  private redisClient: Redis | null = null;
  private fallbackStore = new Map<string, InMemoryOtpEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly cfg: ConfigService) {
    try {
      this.redisClient = new Redis(this.cfg.get('REDIS_URL', 'redis://localhost:6379'), {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 1500,
        commandTimeout: 1500,
      });
    } catch {
      this.redisClient = null;
    }
    this.cleanupTimer = setInterval(() => this.cleanupExpiredFallback(), 30_000);
  }

  onModuleDestroy() {
    try { this.redisClient?.disconnect(); } catch {}
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.fallbackStore.clear();
  }

  private static generateDigits(): string {
    const n = 100000 + Math.floor(Math.random() * 900000);
    return String(n);
  }

  private static key(purpose: OtpPurpose, identifier: string): string {
    return `studhub:otp:${purpose}:${identifier.trim().toLowerCase()}`;
  }

  async generate(
    purpose: OtpPurpose,
    identifier: string,
    ttlSec = 600,
  ): Promise<{ code: string; expiresInSec: number; storedBy: 'redis' | 'memory'; identifier: string; purpose: OtpPurpose }> {
    const cleanId = identifier.trim().toLowerCase();
    const code = OtpService.generateDigits();
    const key = OtpService.key(purpose, cleanId);

    let storedBy: 'redis' | 'memory' = 'memory';
    try {
      const r = this.redisClient;
      if (r) {
        await r.setex(key, ttlSec, JSON.stringify({ code, attempts: 0, createdAt: Date.now() }));
        storedBy = 'redis';
      } else {
        this.fallbackStore.set(key, { code, expiresAt: Date.now() + ttlSec * 1000, attempts: 0 });
        storedBy = 'memory';
      }
    } catch {
      this.fallbackStore.set(key, { code, expiresAt: Date.now() + ttlSec * 1000, attempts: 0 });
      storedBy = 'memory';
    }

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[OTP ${purpose}] ${cleanId} → code ${code} (${ttlSec}s, ${storedBy})`);
    }

    return { code, expiresInSec: ttlSec, storedBy, identifier: cleanId, purpose };
  }

  async verify(
    purpose: OtpPurpose,
    identifier: string,
    code: string,
  ): Promise<{ valid: boolean; reason?: 'expired' | 'invalid' | 'too_many_attempts' | 'not_found' }> {
    return this.checkOtp(purpose, identifier, code, false);
  }

  async verifyAndConsume(
    purpose: OtpPurpose,
    identifier: string,
    code: string,
  ): Promise<{ valid: boolean; reason?: 'expired' | 'invalid' | 'too_many_attempts' | 'not_found' }> {
    return this.checkOtp(purpose, identifier, code, true);
  }

  private async checkOtp(
    purpose: OtpPurpose,
    identifier: string,
    code: string,
    consume: boolean,
  ): Promise<{ valid: boolean; reason?: 'expired' | 'invalid' | 'too_many_attempts' | 'not_found' }> {
    const cleanId = identifier.trim().toLowerCase();
    const userCode = (code || '').trim();
    if (!userCode || !/^\d{6}$/.test(userCode)) return { valid: false, reason: 'invalid' };

    const key = OtpService.key(purpose, cleanId);

    try {
      const r = this.redisClient;
      if (r) {
        const raw = await r.get(key);
        if (raw) {
          const entry = JSON.parse(raw) as { code: string; attempts?: number };
          const attempts = Math.max(0, entry.attempts ?? 0);
          if (attempts >= 5) {
            await r.del(key);
            return { valid: false, reason: 'too_many_attempts' };
          }
          if (entry.code === userCode) {
            if (consume) await r.del(key);
            return { valid: true };
          }
          const ttl = await r.ttl(key);
          entry.attempts = attempts + 1;
          await r.setex(key, Math.max(1, ttl), JSON.stringify(entry));
          return { valid: false, reason: 'invalid' };
        }
      }
    } catch {
      // Redis down → memory
    }

    const entry = this.fallbackStore.get(key);
    if (!entry) return { valid: false, reason: 'not_found' };
    if (Date.now() > entry.expiresAt) {
      this.fallbackStore.delete(key);
      return { valid: false, reason: 'expired' };
    }
    if (entry.attempts >= 5) {
      this.fallbackStore.delete(key);
      return { valid: false, reason: 'too_many_attempts' };
    }
    if (entry.code === userCode) {
      if (consume) this.fallbackStore.delete(key);
      return { valid: true };
    }
    entry.attempts += 1;
    return { valid: false, reason: 'invalid' };
  }

  async exists(purpose: OtpPurpose, identifier: string): Promise<boolean> {
    const key = OtpService.key(purpose, identifier.trim().toLowerCase());
    try {
      const r = this.redisClient;
      if (r) {
        const ttl = await r.ttl(key);
        if (ttl > 0) return true;
      }
    } catch { /* fallback */ }
    const entry = this.fallbackStore.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.fallbackStore.delete(key);
      return false;
    }
    return true;
  }

  private cleanupExpiredFallback() {
    const now = Date.now();
    for (const [k, v] of this.fallbackStore) {
      if (now > v.expiresAt) this.fallbackStore.delete(k);
    }
  }
}
