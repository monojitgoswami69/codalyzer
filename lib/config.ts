export const config = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  MAX_TOKENS: parseInt(process.env.MAX_TOKENS || '4096', 10),
  TEMPERATURE: parseFloat(process.env.TEMPERATURE || '0.3'),

  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

  DAILY_RATE_LIMIT: parseInt(process.env.DAILY_RATE_LIMIT || '20', 10),
  GLOBAL_RATE_LIMIT: parseInt(process.env.GLOBAL_RATE_LIMIT || '1000', 10),
  RATE_LIMIT_TIMEZONE: process.env.RATE_LIMIT_TIMEZONE || 'UTC',

  MAX_CODE_LENGTH: parseInt(process.env.MAX_CODE_LENGTH || '50000', 10),
  MAX_ANALYSIS_SIZE: parseInt(process.env.MAX_ANALYSIS_SIZE || '102400', 10),

  SHARE_TTL_SECONDS: parseInt(process.env.SHARE_TTL_SECONDS || '604800', 10),
  GEMINI_TIMEOUT_MS: parseInt(process.env.GEMINI_TIMEOUT_SECONDS || '25', 10) * 1000,

  MAX_CODE_SNIPPET_LENGTH: 4096,
};

export function rateLimitingEnabled(): boolean {
  return !!(config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN);
}
