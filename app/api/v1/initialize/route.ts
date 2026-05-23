import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getClientIp, getRemainingRequests, nextReset } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const remaining = await getRemainingRequests(ip);

  return NextResponse.json({
    success: true,
    user_requests_remaining: remaining.userRemaining,
    user_requests_limit: config.DAILY_RATE_LIMIT,
    global_requests_remaining: remaining.globalRemaining,
    global_requests_limit: config.GLOBAL_RATE_LIMIT,
    reset_at: nextReset().toISOString(),
  });
}
