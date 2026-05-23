export interface FileNode {
  id: string;
  name: string;
  content: string;
  language: string;
}

export interface StoredFileNode extends FileNode {
  contentHash: string;
  lastModified: number;
}

export enum ComplexityRating {
  Good = 'Good',
  Fair = 'Fair',
  Poor = 'Poor',
}

export interface ComplexityMetric {
  notation: string;
  description: string;
  rating: ComplexityRating;
}

export interface Issue {
  id: string;
  type: 'Optimization' | 'Bug' | 'Critical' | 'Security' | 'Style';
  title: string;
  description: string;
  codeSnippet: string;
  fixType: 'code' | 'no-code';
  fix: string;
}

export interface PerformancePoint {
  n: number;
  ops: number;
}

export interface AnalysisResult {
  fileName: string;
  language: string;
  timestamp: string;
  sourceCode: string;
  timeComplexity: {
    best: ComplexityMetric;
    average: ComplexityMetric;
    worst: ComplexityMetric;
  };
  spaceComplexity: ComplexityMetric;
  performanceData: PerformancePoint[];
  issues: Issue[];
  summary: string;
}

export interface RateLimitInfo {
  userRemaining: number;
  userLimit: number;
  globalRemaining: number;
  globalLimit: number;
  resetAt: string;
}

export interface ShareInfo {
  shareId: string;
  expiresIn: number;
}

export interface HistoryEntry {
  id: string;
  fileName: string;
  language: string;
  timestamp: string;
  bestCase: string;
  worstCase: string;
  issueCount: number;
  analyzedAt: number;
}

export type Theme = 'dark' | 'light';

export type AppView = 'landing' | 'editor' | 'dashboard' | 'shared';
