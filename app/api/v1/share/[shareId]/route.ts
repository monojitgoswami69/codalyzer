import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;

  if (!shareId || shareId.length > 64 || !/^[\x00-\x7F]+$/.test(shareId)) {
    return NextResponse.json({ success: false, detail: 'Invalid share ID' }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ success: false, detail: 'Sharing unavailable' }, { status: 503 });
  }

  try {
    const data = await redis.get(`codalyzer:share:${shareId}`);
    if (data === null || data === undefined) {
      return NextResponse.json({ success: false, detail: 'Share not found or expired' }, { status: 404 });
    }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('Failed to retrieve share:', err);
    return NextResponse.json({ success: false, detail: 'Failed to retrieve share' }, { status: 500 });
  }
}
