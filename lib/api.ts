import { AnalysisResult, ComplexityRating, RateLimitInfo, ShareInfo } from './types';
import { setStoredRateLimit } from './storage';

const API_V1 = '/api/v1';

function mapRating(rating: string): ComplexityRating {
  const map: Record<string, ComplexityRating> = {
    Good: ComplexityRating.Good,
    Fair: ComplexityRating.Fair,
    Poor: ComplexityRating.Poor,
  };
  return map[rating] ?? ComplexityRating.Fair;
}

function normalizeLanguage(lang: string): string {
  if (!lang) return '';
  const l = lang.toLowerCase();
  if (l === 'javascript' || l === 'js') return 'JavaScript';
  if (l === 'typescript' || l === 'ts') return 'TypeScript';
  if (l === 'python' || l === 'py') return 'Python';
  if (l === 'cpp' || l === 'c++') return 'C++';
  if (l === 'c') return 'C';
  if (l === 'java') return 'Java';
  if (l === 'go') return 'Go';
  if (l === 'rust') return 'Rust';
  if (l === 'ruby') return 'Ruby';
  if (l === 'php') return 'PHP';
  return lang.charAt(0).toUpperCase() + lang.slice(1);
}

function transformResponse(data: any, code: string): AnalysisResult {
  return {
    fileName: data.fileName,
    language: normalizeLanguage(data.language),
    timestamp: data.timestamp,
    sourceCode: code,
    timeComplexity: {
      best: { ...data.timeComplexity.best, rating: mapRating(data.timeComplexity.best.rating) },
      average: { ...data.timeComplexity.average, rating: mapRating(data.timeComplexity.average.rating) },
      worst: { ...data.timeComplexity.worst, rating: mapRating(data.timeComplexity.worst.rating) },
    },
    spaceComplexity: { ...data.spaceComplexity, rating: mapRating(data.spaceComplexity.rating) },
    performanceData: [],
    issues: (data.issues || []).map((issue: any) => ({
      id: issue.id,
      type: issue.type,
      title: issue.title,
      description: issue.description,
      codeSnippet: issue.code_snippet,
      fixType: issue.fix_type,
      fix: issue.fix,
    })),
    summary: data.summary,
  };
}

function extractRateLimitFromHeaders(headers: Headers): Partial<RateLimitInfo> {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');
  const gLimit = headers.get('X-RateLimit-Global-Limit');
  const gRemaining = headers.get('X-RateLimit-Global-Remaining');

  const info: Partial<RateLimitInfo> = {};
  if (limit !== null) info.userLimit = parseInt(limit, 10);
  if (remaining !== null) info.userRemaining = parseInt(remaining, 10);
  if (reset !== null) info.resetAt = reset;
  if (gLimit !== null) info.globalLimit = parseInt(gLimit, 10);
  if (gRemaining !== null) info.globalRemaining = parseInt(gRemaining, 10);
  return info;
}

let _rateLimitCallback: ((info: Partial<RateLimitInfo>) => void) | null = null;

function notifyRateLimit(headers: Headers) {
  const info = extractRateLimitFromHeaders(headers);
  if (Object.keys(info).length > 0) {
    setStoredRateLimit(info);
    if (_rateLimitCallback) _rateLimitCallback(info);
  }
}

export function onRateLimitUpdate(cb: (info: Partial<RateLimitInfo>) => void): void {
  _rateLimitCallback = cb;
}

export class ApiError extends Error {
  status: number;
  isRateLimit: boolean;
  rateLimitInfo?: Partial<RateLimitInfo>;
  constructor(message: string, status: number, isRateLimit = false, rateLimitInfo?: Partial<RateLimitInfo>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isRateLimit = isRateLimit;
    this.rateLimitInfo = rateLimitInfo;
  }
}

export async function initialize(): Promise<RateLimitInfo> {
  try {
    const res = await fetch(`${API_V1}/initialize`);
    notifyRateLimit(res.headers);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const info: RateLimitInfo = {
      userRemaining: data.user_requests_remaining,
      userLimit: data.user_requests_limit,
      globalRemaining: data.global_requests_remaining,
      globalLimit: data.global_requests_limit,
      resetAt: data.reset_at,
    };
    setStoredRateLimit(info);
    return info;
  } catch {
    return { userRemaining: 20, userLimit: 20, globalRemaining: 1000, globalLimit: 1000, resetAt: '' };
  }
}

export async function analyzeCode(code: string, fileName?: string): Promise<AnalysisResult> {
  const payload: Record<string, string> = { code, language: 'auto' };
  const isGeneric = !fileName || fileName.startsWith('Snippet-');
  if (!isGeneric) payload.filename = fileName!;

  const res = await fetch(`${API_V1}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  notifyRateLimit(res.headers);

  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const rlInfo = extractRateLimitFromHeaders(res.headers);
    throw new ApiError(
      body.message || 'Rate limit exceeded',
      429,
      true,
      { ...rlInfo, userRemaining: 0, resetAt: body.reset_at || rlInfo.resetAt || '' },
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(body.detail || body.error || `HTTP ${res.status}`, res.status);
  }

  const data = await res.json();
  if (!data.success) throw new ApiError(data.error || 'Analysis failed', 500);

  return transformResponse(data.result, code);
}

export async function createShare(result: AnalysisResult): Promise<ShareInfo> {
  const payload = {
    fileName: result.fileName,
    language: result.language,
    timestamp: result.timestamp,
    sourceCode: result.sourceCode,
    timeComplexity: result.timeComplexity,
    spaceComplexity: result.spaceComplexity,
    issues: result.issues,
    summary: result.summary,
  };

  const res = await fetch(`${API_V1}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  notifyRateLimit(res.headers);

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Share failed' }));
    throw new ApiError(body.detail || 'Failed to create share link', res.status);
  }

  const data = await res.json();
  return { shareId: data.share_id, expiresIn: data.expires_in };
}

export async function getShare(shareId: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_V1}/share/${encodeURIComponent(shareId)}`);
  notifyRateLimit(res.headers);
  if (res.status === 404) throw new ApiError('Share not found or expired', 404);
  if (!res.ok) throw new ApiError('Failed to load shared result', res.status);

  const data = await res.json();
  if (!data.success) throw new ApiError('Invalid share data', 500);

  // Shared payload uses our normalized issue shape (codeSnippet, fixType)
  // Construct an AnalysisResult directly to avoid double-transform.
  const r = data.result;
  return {
    fileName: r.fileName,
    language: normalizeLanguage(r.language),
    timestamp: r.timestamp,
    sourceCode: r.sourceCode || '',
    timeComplexity: {
      best: { ...r.timeComplexity.best, rating: mapRating(r.timeComplexity.best.rating) },
      average: { ...r.timeComplexity.average, rating: mapRating(r.timeComplexity.average.rating) },
      worst: { ...r.timeComplexity.worst, rating: mapRating(r.timeComplexity.worst.rating) },
    },
    spaceComplexity: { ...r.spaceComplexity, rating: mapRating(r.spaceComplexity.rating) },
    performanceData: [],
    issues: r.issues || [],
    summary: r.summary,
  };
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_V1}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
