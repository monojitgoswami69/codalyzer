import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeRequestSchema, validateMessageContent } from '@/lib/validation';
import { analyze, isAvailable } from '@/lib/gemini';
import { checkAndIncrement, refundIp, rateLimitHeaders, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!isAvailable()) {
    return NextResponse.json(
      { success: false, error: 'service_unavailable', detail: 'Gemini provider unavailable — check API key' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request format' }, { status: 400 });
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request format' }, { status: 422 });
  }

  if (!validateMessageContent(parsed.data.code)) {
    return NextResponse.json({ success: false, detail: 'Invalid code content' }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rate = await checkAndIncrement(ip);
  if (!rate.allowed) {
    return rate.response!;
  }

  try {
    const data = await analyze(parsed.data.code, parsed.data.filename, parsed.data.language);

    const result = {
      summary: data.summary,
      fileName: data.fileName,
      language: data.language,
      timeComplexity: data.timeComplexity,
      spaceComplexity: data.spaceComplexity,
      issues: data.issues,
      sourceCode: data.sourceCode,
      timestamp: data.timestamp,
    };

    return NextResponse.json(
      { success: true, result, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite' },
      { headers: rateLimitHeaders(rate.ipCount) },
    );
  } catch (err: unknown) {
    await refundIp(ip);

    const message = err instanceof Error ? err.message : 'Analysis failed';
    if (message.includes('timed out')) {
      return NextResponse.json(
        { success: false, detail: 'Analysis timed out - code may be too complex' },
        { status: 504 },
      );
    }
    if (message.includes('invalid JSON') || message.includes('snippet too large')) {
      return NextResponse.json(
        { success: false, detail: 'Failed to parse analysis result' },
        { status: 500 },
      );
    }
    console.error('Analysis error:', err);
    return NextResponse.json(
      { success: false, detail: message || 'Analysis failed' },
      { status: 500 },
    );
  }
}
