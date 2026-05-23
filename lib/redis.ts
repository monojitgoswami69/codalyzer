import { Redis } from '@upstash/redis';
import { config, rateLimitingEnabled } from './config';

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!rateLimitingEnabled()) return null;
  if (!_redis) {
    _redis = new Redis({
      url: config.UPSTASH_REDIS_REST_URL,
      token: config.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}
