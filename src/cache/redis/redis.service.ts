import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis | null;
  private readonly logger = new Logger(RedisService.name);
  private readonly enabled: boolean;
  private readonly prefix: string;

  constructor(private readonly config: ConfigService) {
    this.enabled =
      String(config.get('CACHE_ENABLED') ?? 'false').toLowerCase() === 'true';
    const env = config.get<string>('NODE_ENV') || 'development';
    this.prefix = `spa:${env}:`;
    if (!this.enabled) {
      this.logger.warn(
        'Redis cache is disabled — falling back to database only',
      );
      this.client = null;
      return;
    }
    const host = this.config.get<string>('REDIS_HOST', '127.0.0.1');
    const port = Number(this.config.get<string>('REDIS_PORT', '6379'));
    
      this.logger.log(`Redis config: ${host}:${port}`);

    this.client = new Redis({
      host,
      port,
      maxRetriesPerRequest: 1,
    });
    this.client.on('error', (error) => {
      this.logger.error(error);
    });
  }

  async set(
    key: string,
    value: string,
    expirationInSeconds?: number,
  ): Promise<void> {
    if (!this.enabled || !this.client) return;

    if (expirationInSeconds !== undefined) {
      await this.client.set(key, value, 'EX', expirationInSeconds);
      return;
    }

    await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    if (!this.enabled || !this.client) return null;

    return this.client.get(key);
  }

  async delete(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;

    await this.client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }
}
