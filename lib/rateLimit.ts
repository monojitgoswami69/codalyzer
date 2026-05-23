import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from './redis';
import { config, rateLimitingEnabled } from './config';

function dayStr(): string {
  const now = new Date();
  const tzOffsetParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.RATE_LIMIT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = tzOffsetParts.find((p) => p.type === 'year')?.value || '';
  const m = tzOffsetParts.find((p) => p.type === 'month')?.value || '';
  const d = tzOffsetParts.find((p) => p.type === 'day')?.value || '';
  return `${y}${m}${d}`;
}

function ipKey(ip: string): string {
  return `codalyzer:rl:day:${dayStr()}:ip:${ip}`;
}

function globalKey(): string {
  return `codalyzer:rl:global:day:${dayStr()}`;
}

export function nextReset(): Date {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: config.RATE_LIMIT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const y = parseInt(fmt.find((p) => p.type === 'year')!.value, 10);
  const m = parseInt(fmt.find((p) => p.type === 'month')!.value, 10);
  const d = parseInt(fmt.find((p) => p.type === 'day')!.value, 10);
  const midnight = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  return midnight;
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

export interface RateCheckResult {
  allowed: boolean;
  ipCount: number;
  globalCount: number;
  response?: NextResponse;
}

export async function checkAndIncrement(ip: string): Promise<RateCheckResult> {
  const redis = getRedis();
  if (!redis) {
    if (rateLimitingEnabled()) {
      return {
        allowed: false,
        ipCount: 0,
        globalCount: 0,
        response: NextResponse.json(
          { success: false, error: 'service_unavailable', message: 'Rate limiting service temporarily unavailable' },
          { status: 503 },
        ),
      };
    }
    return { allowed: true, ipCount: 0, globalCount: 0 };
  }

  const ipK = ipKey(ip);
  const gK = globalKey();
  const ttl = 90000;

  try {
    const [ipCountRaw, globalCountRaw] = await Promise.all([
      redis.incr(ipK),
      redis.incr(gK),
    ]);
    const ipCount = Number(ipCountRaw);
    const globalCount = Number(globalCountRaw);
    if (ipCount === 1) await redis.expire(ipK, ttl);
    if (globalCount === 1) await redis.expire(gK, ttl);

    const reset = nextReset();
    const secondsUntilReset = Math.floor((reset.getTime() - Date.now()) / 1000);

    if (ipCount > config.DAILY_RATE_LIMIT) {
      return {
        allowed: false,
        ipCount,
        globalCount,
        response: NextResponse.json(
          {
            success: false,
            error: 'rate_limit_exceeded',
            message: `Rate limit of ${config.DAILY_RATE_LIMIT} requests per day exceeded`,
            reset_at: reset.toISOString(),
            requests_made: ipCount,
            limit: config.DAILY_RATE_LIMIT,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(secondsUntilReset),
              'X-RateLimit-Limit': String(config.DAILY_RATE_LIMIT),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': reset.toISOString(),
            },
          },
        ),
      };
    }

    if (globalCount > config.GLOBAL_RATE_LIMIT) {
      return {
        allowed: false,
        ipCount,
        globalCount,
        response: NextResponse.json(
          {
            success: false,
            error: 'global_limit_exceeded',
            message: `Global rate limit of ${config.GLOBAL_RATE_LIMIT} requests per day exceeded`,
            reset_at: reset.toISOString(),
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(secondsUntilReset),
              'X-RateLimit-Global-Limit': String(config.GLOBAL_RATE_LIMIT),
              'X-RateLimit-Global-Remaining': '0',
              'X-RateLimit-Reset': reset.toISOString(),
            },
          },
        ),
      };
    }

    return { allowed: true, ipCount, globalCount };
  } catch (err) {
    console.error('Rate limit error:', err);
    return {
      allowed: false,
      ipCount: 0,
      globalCount: 0,
      response: NextResponse.json(
        { success: false, error: 'service_unavailable', message: 'Rate limiting service error' },
        { status: 503 },
      ),
    };
  }
}

export async function refundIp(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const ipK = ipKey(ip);
  const gK = globalKey();
  try {
    const ipExists = await redis.exists(ipK);
    if (ipExists) {
      const newCount = await redis.decr(ipK);
      if (Number(newCount) < 0) await redis.set(ipK, 0);
    }
    const gExists = await redis.exists(gK);
    if (gExists) {
      const newCount = await redis.decr(gK);
      if (Number(newCount) < 0) await redis.set(gK, 0);
    }
  } catch (err) {
    console.error('Refund error:', err);
  }
}

export async function getRemainingRequests(ip: string): Promise<{ userRemaining: number; globalRemaining: number }> {
  const redis = getRedis();
  if (!redis) {
    return {
      userRemaining: config.DAILY_RATE_LIMIT,
      globalRemaining: config.GLOBAL_RATE_LIMIT,
    };
  }
  try {
    const [ipRaw, globalRaw] = await Promise.all([
      redis.get<number | string>(ipKey(ip)),
      redis.get<number | string>(globalKey()),
    ]);
    const ipCount = Number(ipRaw) || 0;
    const globalCount = Number(globalRaw) || 0;
    return {
      userRemaining: Math.max(0, config.DAILY_RATE_LIMIT - ipCount),
      globalRemaining: Math.max(0, config.GLOBAL_RATE_LIMIT - globalCount),
    };
  } catch (err) {
    console.error('Redis read error:', err);
    return { userRemaining: 0, globalRemaining: 0 };
  }
}

export function rateLimitHeaders(ipCount: number): Record<string, string> {
  const reset = nextReset();
  return {
    'X-RateLimit-Limit': String(config.DAILY_RATE_LIMIT),
    'X-RateLimit-Remaining': String(Math.max(0, config.DAILY_RATE_LIMIT - ipCount)),
    'X-RateLimit-Reset': reset.toISOString(),
  };
}
