// ─── Utility: Detect language from filename or content ──────────────────

import { EXT_TO_LANGUAGE } from '../constants';

export function detectLanguage(fileName: string, content: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext && EXT_TO_LANGUAGE[ext]) return EXT_TO_LANGUAGE[ext];

  // Content-based heuristics for unnamed files
  if (content.includes('def ') || content.includes('import numpy') || content.includes('print(')) return 'Python';
  if (content.includes('#include') || content.includes('std::')) return 'C++';
  if (content.includes('public class') || content.includes('System.out')) return 'Java';
  if (content.includes('func ') && content.includes('package ')) return 'Go';
  if (content.includes('fn ') && content.includes('let mut')) return 'Rust';

  return '';
}
