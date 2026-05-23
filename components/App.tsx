'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { LandingPage } from './LandingPage';
import { EditorView } from './EditorView';
import { DashboardView } from './DashboardView';
import { MobileWarning } from './MobileWarning';
import { HistoryPanel } from './HistoryPanel';
import { useTheme } from './ThemeProvider';
import { AnalysisResult, AppView, RateLimitInfo } from '@/lib/types';
import { analyzeCode, initialize as apiInitialize, onRateLimitUpdate, ApiError } from '@/lib/api';
import {
  getStoredFiles, saveFiles, getReportForFile, saveReport,
  deleteReport, getActiveFileId, setActiveFileId as saveActiveFileId,
  computeContentHash, StoredFile, getHistory, addHistoryEntry, clearHistory,
  getStoredRateLimit,
} from '@/lib/storage';
import { detectLanguage } from '@/lib/detectLanguage';
import { AlertTriangle, Loader2 } from 'lucide-react';

const SharedView = lazy(() => import('./SharedView').then((m) => ({ default: m.SharedView })));

function getShareIdFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('share');
  if (!raw) return null;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(raw)) return null;
  return raw;
}

export const App: React.FC = () => {
  // ensure theme provider is in tree (rendered upstream)
  useTheme();

  const [shareId, setShareId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('landing');
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ReturnType<typeof getHistory>>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sid = getShareIdFromURL();
    setShareId(sid);
    if (sid) setView('shared');

    setIsMobile(
      window.innerWidth < 1024 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    );

    const handler = () => {
      setIsMobile(
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      );
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const stored = getStoredFiles();
    const storedActive = getActiveFileId();
    setFiles(stored);
    if (stored.length > 0) {
      const active = storedActive && stored.some((f) => f.id === storedActive)
        ? storedActive
        : stored[0].id;
      setActiveFileId(active);
    }
    setHistory(getHistory());
    setIsInitialized(true);

    const storedRL = getStoredRateLimit();
    if (storedRL) setRateLimit(storedRL);

    apiInitialize().then(setRateLimit).catch(() => {});

    onRateLimitUpdate((partial) => {
      setRateLimit((prev) => {
        const base = prev || { userRemaining: 0, userLimit: 20, globalRemaining: 0, globalLimit: 1000, resetAt: '' };
        return { ...base, ...partial };
      });
    });
  }, [mounted]);

  useEffect(() => {
    if (isInitialized) saveFiles(files);
  }, [files, isInitialized]);

  useEffect(() => {
    if (isInitialized && activeFileId) saveActiveFileId(activeFileId);
  }, [activeFileId, isInitialized]);

  const activeFile = files.find((f) => f.id === activeFileId) || null;
  const currentReport = activeFile ? getReportForFile(activeFile.id) : null;
  const hasValidReport = !!(currentReport && currentReport.contentHash === activeFile?.contentHash);

  const handleFileCreate = useCallback(() => {
    setFiles((prev) => {
      const newFile: StoredFile = {
        id: Date.now().toString(),
        name: `Snippet-${prev.length + 1}`,
        content: '',
        language: '',
        contentHash: computeContentHash(''),
        lastModified: Date.now(),
      };
      setActiveFileId(newFile.id);
      return [...prev, newFile];
    });
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    const text = await file.text();
    const fileId = Date.now().toString();
    const syncLanguage = detectLanguage(file.name, text);
    const newFile: StoredFile = {
      id: fileId,
      name: file.name,
      content: text,
      language: syncLanguage,
      contentHash: computeContentHash(text),
      lastModified: Date.now(),
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(fileId);
  }, []);

  const handleFileDelete = useCallback((id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      deleteReport(id);
      if (activeFileId === id) {
        setActiveFileId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [activeFileId]);

  const handleCodeChange = useCallback((id: string, newCode: string) => {
    const truncatedCode = newCode.slice(0, 4096);
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, content: truncatedCode, contentHash: computeContentHash(truncatedCode), lastModified: Date.now() }
          : f,
      ),
    );
  }, []);

  const handleLanguageChange = useCallback((id: string, language: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, language, lastModified: Date.now() } : f)),
    );
  }, []);

  const handleAnalyze = useCallback(
    async (code: string, forceReanalyze = false) => {
      if (!activeFile) return;

      if (!forceReanalyze && hasValidReport && currentReport) {
        setAnalysisResult(currentReport.result);
        setView('dashboard');
        return;
      }

      setIsAnalyzing(true);
      setErrorMessage(null);
      try {
        const result = await analyzeCode(code, activeFile.name);

        const isGeneric = activeFile.name.startsWith('Snippet-') || activeFile.name === 'untitled';
        const lacksInfo = !activeFile.language || !activeFile.name.includes('.');

        if (isGeneric || lacksInfo) {
          const updates: Partial<StoredFile> = {};
          if (result.fileName && result.fileName !== activeFile.name) {
            updates.name = result.fileName;
            updates.language = detectLanguage(result.fileName, code);
          } else if (result.language && !activeFile.language) {
            updates.language = result.language;
          }
          if (Object.keys(updates).length > 0) {
            setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, ...updates, lastModified: Date.now() } : f)));
          }
        }

        saveReport(activeFile.id, activeFile.contentHash, result);
        addHistoryEntry(result);
        setHistory(getHistory());

        setAnalysisResult(result);
        setView('dashboard');
      } catch (error) {
        if (error instanceof ApiError && error.isRateLimit) {
          setErrorMessage(`Rate limit reached. Resets at ${new Date(error.rateLimitInfo?.resetAt || '').toLocaleTimeString() || 'midnight'}.`);
        } else {
          setErrorMessage('Analysis failed. Please check your connection and try again.');
        }
      } finally {
        setIsAnalyzing(false);
      }
    },
    [activeFile, activeFileId, hasValidReport, currentReport],
  );

  const handleViewReport = useCallback(() => {
    if (currentReport) {
      setAnalysisResult(currentReport.result);
      setView('dashboard');
    }
  }, [currentReport]);

  const handleReanalyze = useCallback(() => {
    if (activeFile) handleAnalyze(activeFile.content, true);
  }, [activeFile, handleAnalyze]);

  const handleGetStarted = useCallback(() => setView('editor'), []);
  const handleBackToEditor = useCallback(() => setView('editor'), []);

  const handleGoHome = useCallback(() => {
    if (window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setView('landing');
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (isMobile) {
    return <MobileWarning />;
  }

  return (
    <div className="min-h-screen font-sans flex flex-col relative overflow-hidden">
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-red-900/90 border border-red-700 text-red-200 px-4 py-3 rounded shadow-xl flex items-center gap-3 max-w-md animate-fade-in">
          <AlertTriangle size={18} />
          <span className="text-sm font-medium flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-300 hover:text-white ml-2" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {showHistory && (
        <HistoryPanel
          history={history}
          onClose={() => setShowHistory(false)}
          onClear={() => {
            clearHistory();
            setHistory([]);
          }}
        />
      )}

      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-[#0b1120]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <span className="text-slate-400 font-mono text-sm tracking-widest uppercase animate-pulse">
                Initializing System...
              </span>
            </div>
          </div>
        }
      >
        <div className={`absolute inset-0 ${view === 'editor' || view === 'landing' ? 'z-0' : 'z-[-1] opacity-0 pointer-events-none'}`}>
          <EditorView
            files={files}
            activeFileId={activeFileId}
            onFileSelect={setActiveFileId}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            onFileUpload={handleFileUpload}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
            onAnalyze={handleAnalyze}
            onViewReport={handleViewReport}
            onShowHistory={() => setShowHistory(true)}
            isAnalyzing={isAnalyzing}
            hasValidReport={hasValidReport}
            rateLimit={rateLimit}
          />
        </div>

        {view === 'landing' && (
          <div className="absolute inset-0 z-50">
            <LandingPage onGetStarted={handleGetStarted} />
          </div>
        )}

        <div className={`absolute inset-0 overflow-y-auto ${view === 'dashboard' && analysisResult ? 'z-10' : 'z-[-1] opacity-0 pointer-events-none'}`}>
          {analysisResult && (
            <DashboardView
              result={analysisResult}
              onNewAnalysis={handleBackToEditor}
              onReanalyze={handleReanalyze}
              isReanalyzing={isAnalyzing}
            />
          )}
        </div>

        {view === 'shared' && shareId && (
          <div className="absolute inset-0 z-10 overflow-y-auto">
            <SharedView shareId={shareId} onGoHome={handleGoHome} />
          </div>
        )}
      </Suspense>
    </div>
  );
};
