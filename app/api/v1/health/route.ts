import { NextResponse } from 'next/server';
import { isAvailable } from '@/lib/gemini';
import { getRedis } from '@/lib/redis';
import { config, rateLimitingEnabled } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let status = 'ok';
  const issues: string[] = [];

  if (!isAvailable()) {
    status = 'degraded';
    issues.push('gemini_unavailable');
  }

  if (rateLimitingEnabled()) {
    const redis = getRedis();
    if (!redis) {
      status = 'degraded';
      issues.push('redis_unavailable');
    } else {
      try {
        await redis.ping();
      } catch {
        status = 'degraded';
        issues.push('redis_unreachable');
      }
    }
  }

  return NextResponse.json({
    status,
    version: '4.0.0',
    model: config.GEMINI_MODEL,
    timestamp: new Date().toISOString(),
    ...(issues.length > 0 ? { issues } : {}),
  });
}
