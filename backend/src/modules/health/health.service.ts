import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../common/prisma/prisma.service';

const startedAt = Date.now();

@Injectable()
export class HealthService {
  private redisClient: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigService,
  ) {}

  private getRedis() {
    if (!this.redisClient) {
      try { this.redisClient = new Redis(this.cfg.get('REDIS_URL', 'redis://localhost:6379'), { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false }); }
      catch { this.redisClient = null; }
    }
    return this.redisClient;
  }

  async checkAll() {
    let db = 'unknown', redisStatus = 'unknown', redisLatencyMs: number | null = null;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'ok';
    } catch { db = 'down'; }

    try {
      const r = this.getRedis();
      if (r) {
        const t0 = Date.now();
        const pong = await r.ping();
        redisLatencyMs = Date.now() - t0;
        redisStatus = (pong === 'PONG') ? 'ok' : 'error';
      } else redisStatus = 'disabled';
    } catch { redisStatus = 'down'; }

    const uptimeSec = Math.floor((Date.now() - startedAt) / 1000);
    const allOk = db === 'ok' && (redisStatus === 'ok' || redisStatus === 'disabled');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: `${uptimeSec}s`,
      uptimeSeconds: uptimeSec,
      components: {
        api: 'ok',
        db: db,
        redis: { status: redisStatus, latencyMs: redisLatencyMs },
      },
      node: process.version,
      env: this.cfg.get('NODE_ENV', 'development'),
      memory: { rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024) },
    };
  }
}
