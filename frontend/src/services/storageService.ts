// ─── Storage Service ────────────────────────────────────────────────────
// Handles localStorage persistence for files, reports, history, and preferences.

import { FileNode, AnalysisResult, HistoryEntry, Theme } from '../types';

const KEYS = {
  FILES: 'codalyzer-v2-files',
  REPORTS: 'codalyzer-v2-reports',
  ACTIVE_FILE: 'codalyzer-v2-active-file',
  HISTORY: 'codalyzer-v2-history',
  THEME: 'codalyzer-v2-theme',
  RATE_LIMIT: 'codalyzer-v2-rate-limit',
} as const;

// ─── File Storage ──────────────────────────────────────────────────────

export interface StoredFile extends FileNode {
  contentHash: string;
  lastModified: number;
}

export interface StoredReport {
  fileId: string;
  contentHash: string;
  result: AnalysisResult;
  analyzedAt: number;
}

/** Simple djb2-style hash for content comparison */
export function computeContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Files ─────────────────────────────────────────────────────────────

export function getStoredFiles(): StoredFile[] {
  return readJSON<StoredFile[]>(KEYS.FILES, []);
}

export function saveFiles(files: StoredFile[]): void {
  writeJSON(KEYS.FILES, files);
}

// ─── Active File ───────────────────────────────────────────────────────

export function getActiveFileId(): string | null {
  return localStorage.getItem(KEYS.ACTIVE_FILE);
}

export function setActiveFileId(fileId: string): void {
  localStorage.setItem(KEYS.ACTIVE_FILE, fileId);
}

// ─── Reports ───────────────────────────────────────────────────────────

export function getStoredReports(): StoredReport[] {
  return readJSON<StoredReport[]>(KEYS.REPORTS, []);
}

export function getReportForFile(fileId: string): StoredReport | null {
  return getStoredReports().find(r => r.fileId === fileId) ?? null;
}

export function saveReport(fileId: string, contentHash: string, result: AnalysisResult): void {
  const reports = getStoredReports();
  const idx = reports.findIndex(r => r.fileId === fileId);
  const entry: StoredReport = { fileId, contentHash, result, analyzedAt: Date.now() };

  if (idx >= 0) {
    reports[idx] = entry;
  } else {
    reports.push(entry);
  }
  writeJSON(KEYS.REPORTS, reports);
}

export function deleteReport(fileId: string): void {
  writeJSON(KEYS.REPORTS, getStoredReports().filter(r => r.fileId !== fileId));
}

// ─── History ───────────────────────────────────────────────────────────

const MAX_HISTORY = 50;

export function getHistory(): HistoryEntry[] {
  return readJSON<HistoryEntry[]>(KEYS.HISTORY, []);
}

export function addHistoryEntry(result: AnalysisResult): HistoryEntry {
  const history = getHistory();
  const entry: HistoryEntry = {
    id: `hist-${Date.now()}`,
    fileName: result.fileName,
    language: result.language,
    timestamp: result.timestamp,
    bestCase: result.timeComplexity.best.notation,
    worstCase: result.timeComplexity.worst.notation,
    issueCount: result.issues.length,
    analyzedAt: Date.now(),
  };
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  writeJSON(KEYS.HISTORY, history);
  return entry;
}

export function clearHistory(): void {
  writeJSON(KEYS.HISTORY, []);
}

// ─── Theme ─────────────────────────────────────────────────────────────

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(KEYS.THEME);
  if (stored === 'light' || stored === 'dark') return stored;
  // System preference
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(KEYS.THEME, theme);
}

export function getStoredRateLimit(): any {
  try {
    const raw = sessionStorage.getItem(KEYS.RATE_LIMIT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredRateLimit(info: any): void {
  const current = getStoredRateLimit() || {};
  const updated = { ...current, ...info };
  sessionStorage.setItem(KEYS.RATE_LIMIT, JSON.stringify(updated));
}

// ─── Clear All ─────────────────────────────────────────────────────────

export function clearAllStorage(): void {
  Object.values(KEYS).forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}
