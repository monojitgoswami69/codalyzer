import { z } from 'zod';

const ALLOWED_LANGUAGES = new Set([
  'auto', 'javascript', 'typescript', 'python', 'cpp', 'c',
  'java', 'go', 'rust', 'ruby', 'php',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.py', '.js', '.ts', '.jsx', '.tsx', '.cpp', '.c', '.h', '.hpp',
  '.java', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.cs', '.scala',
  '.r', '.m', '.sh', '.sql', '.html', '.css',
]);

export const AnalyzeRequestSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50000)
    .refine((v) => v.trim().length > 0, 'Code cannot be empty or whitespace only')
    .refine((v) => !/(.)\1{500,}/.test(v), 'Invalid code content detected'),
  filename: z
    .string()
    .max(255)
    .default('untitled')
    .transform((v) => {
      let cleaned = v.trim().replace(/[/\\]/g, '').replace(/\x00/g, '');
      if (!cleaned) return 'untitled';
      if (cleaned.includes('.')) {
        const ext = '.' + cleaned.split('.').pop()!.toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          cleaned = cleaned.replace(/\.[^.]+$/, '') || 'untitled';
        }
      }
      return cleaned || 'untitled';
    }),
  language: z
    .string()
    .max(50)
    .default('auto')
    .transform((v) => {
      const lower = v.trim().toLowerCase();
      return ALLOWED_LANGUAGES.has(lower) ? lower : 'auto';
    }),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export function validateMessageContent(message: string): boolean {
  if (!message || !message.trim()) return false;
  if (/(.)\1{500,}/.test(message)) return false;
  const patterns = [
    /ignore\s+(previous|all|above)\s+instructions?/i,
    /disregard\s+(previous|all|above)/i,
    /system\s*:\s*you\s+are/i,
    /\[\s*system\s*\]/i,
    /new\s+instructions?\s*:/i,
    /forget\s+(everything|all|previous)/i,
  ];
  const head = message.slice(0, 2000);
  for (const p of patterns) {
    if (p.test(head)) return false;
  }
  return true;
}
