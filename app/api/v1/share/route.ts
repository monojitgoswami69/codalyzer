import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { config } from '@/lib/config';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { success: false, detail: 'Sharing unavailable (Redis not configured)' },
      { status: 503 },
    );
  }

  let result;
  try {
    result = await req.json();
  } catch {
    return NextResponse.json({ success: false, detail: 'Invalid request body' }, { status: 400 });
  }

  const shareId = randomBytes(12).toString('base64url');
  const key = `codalyzer:share:${shareId}`;

  try {
    await redis.set(key, JSON.stringify(result), { ex: config.SHARE_TTL_SECONDS });
    return NextResponse.json({
      success: true,
      share_id: shareId,
      expires_in: config.SHARE_TTL_SECONDS,
    });
  } catch (err) {
    console.error('Failed to store share:', err);
    return NextResponse.json(
      { success: false, detail: 'Failed to create share link' },
      { status: 500 },
    );
  }
}
