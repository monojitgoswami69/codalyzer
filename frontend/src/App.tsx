import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { LandingPage } from './components/LandingPage';
const EditorView = lazy(() => import('./components/EditorView').then(m => ({ default: m.EditorView })));
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const SharedView = lazy(() => import('./components/SharedView').then(m => ({ default: m.SharedView })));
import { MobileWarning } from './components/MobileWarning';
import { HistoryPanel } from './components/HistoryPanel';
import { ThemeContext, useThemeProvider } from './hooks/useTheme';
import { AnalysisResult, AppView, RateLimitInfo } from './types';
import { analyzeCode, initialize as apiInitialize, onRateLimitUpdate, ApiError } from './services/apiService';
import {
  getStoredFiles, saveFiles, getReportForFile, saveReport,
  deleteReport, getActiveFileId, setActiveFileId as saveActiveFileId,
  computeContentHash, StoredFile, getHistory, addHistoryEntry, clearHistory,
  getStoredRateLimit,
} from './services/storageService';
import { detectLanguage } from './utils/detectLanguage';
import { AlertTriangle, Loader2 } from 'lucide-react';

// ─── Detect share param ─────────────────────────────────────────────────

function getShareIdFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('share');
}

// ─── App ────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  const themeCtx = useThemeProvider();

  const shareId = useState(() => getShareIdFromURL())[0];

  const [view, setView] = useState<AppView>(() => {
    if (shareId) return 'shared';
    return 'landing';
  });
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(getStoredRateLimit);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(getHistory);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });

  // ─── Resize ───────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = () => {
      setIsMobile(
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ─── Init: load files + rate limit info ───────────────────────────────

  useEffect(() => {
    const stored = getStoredFiles();
    const storedActive = getActiveFileId();
    setFiles(stored);
    if (stored.length > 0) {
      const active = storedActive && stored.some(f => f.id === storedActive)
        ? storedActive
        : stored[0].id;
      setActiveFileId(active);
    }
    setIsInitialized(true);

    // Sync with storage immediately
    const storedRL = getStoredRateLimit();
    if (storedRL) setRateLimit(storedRL);

    // Fetch fresh rate limit status from server
    apiInitialize().then(setRateLimit).catch(() => { });

    // Listen for rate limit updates from response headers
    onRateLimitUpdate(partial => {
      setRateLimit(prev => {
        const base = prev || { userRemaining: 0, userLimit: 20, globalRemaining: 0, globalLimit: 1000, resetAt: '' };
        return { ...base, ...partial };
      });
    });
  }, []);

  // ─── Persist files ────────────────────────────────────────────────────

  useEffect(() => {
    if (isInitialized) saveFiles(files);
  }, [files, isInitialized]);

  useEffect(() => {
    if (isInitialized && activeFileId) saveActiveFileId(activeFileId);
  }, [activeFileId, isInitialized]);

  // ─── Derived ──────────────────────────────────────────────────────────

  const activeFile = files.find(f => f.id === activeFileId) || null;
  const currentReport = activeFile ? getReportForFile(activeFile.id) : null;
  const hasValidReport = !!(currentReport && currentReport.contentHash === activeFile?.contentHash);

  // ─── File handlers ────────────────────────────────────────────────────

  const handleFileCreate = useCallback(() => {
    const newFile: StoredFile = {
      id: Date.now().toString(),
      name: `Snippet-${files.length + 1}`,
      content: '',
      language: '',
      contentHash: computeContentHash(''),
      lastModified: Date.now(),
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, [files.length]);

  const handleFileUpload = useCallback(async (file: File) => {
    const text = await file.text();
    const newFile: StoredFile = {
      id: Date.now().toString(),
      name: file.name,
      content: text,
      language: detectLanguage(file.name, text),
      contentHash: computeContentHash(text),
      lastModified: Date.now(),
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, []);

  const handleFileDelete = useCallback((id: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      deleteReport(id);
      if (activeFileId === id) {
        setActiveFileId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [activeFileId]);

  const handleCodeChange = useCallback((id: string, newCode: string) => {
    const truncatedCode = newCode.slice(0, 4096);
    setFiles(prev => prev.map(f =>
      f.id === id
        ? { ...f, content: truncatedCode, contentHash: computeContentHash(truncatedCode), lastModified: Date.now() }
        : f
    ));
  }, []);

  const handleLanguageChange = useCallback((id: string, language: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, language, lastModified: Date.now() } : f
    ));
  }, []);

  // ─── Analysis ─────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async (code: string, forceReanalyze = false) => {
    if (!activeFile) return;

    // Use cached if valid
    if (!forceReanalyze && hasValidReport && currentReport) {
      setAnalysisResult(currentReport.result);
      setView('dashboard');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const result = await analyzeCode(code, activeFile.name);

      // Auto-rename and language detection update logic
      // We update if the name is generic, or if the file currently lacks a proper extension/language
      const isGeneric = activeFile.name.startsWith('Snippet-') || activeFile.name === 'untitled';
      const lacksInfo = !activeFile.language || !activeFile.name.includes('.');

      if (isGeneric || lacksInfo) {
        const updates: Partial<StoredFile> = {};

        // Use the backend-provided filename if it's better than what we have
        if (result.fileName && result.fileName !== activeFile.name) {
          updates.name = result.fileName;
          // Re-detect language based on the new filename to ensure consistent TitleCase
          updates.language = detectLanguage(result.fileName, code);
        } else if (result.language && !activeFile.language) {
          // If name didn't change but we were missing language, use normalized backend language
          updates.language = result.language;
        }

        if (Object.keys(updates).length > 0) {
          setFiles(prev => prev.map(f =>
            f.id === activeFileId ? { ...f, ...updates, lastModified: Date.now() } : f
          ));
        }
      }

      saveReport(activeFile.id, activeFile.contentHash, result);

      // Add to history
      const entry = addHistoryEntry(result);
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
  }, [activeFile, activeFileId, hasValidReport, currentReport]);

  const handleViewReport = useCallback(() => {
    if (currentReport) {
      setAnalysisResult(currentReport.result);
      setView('dashboard');
    }
  }, [currentReport]);

  const handleReanalyze = useCallback(() => {
    if (activeFile) handleAnalyze(activeFile.content, true);
  }, [activeFile, handleAnalyze]);

  // ─── Navigation ───────────────────────────────────────────────────────

  const handleGetStarted = useCallback(() => setView('editor'), []);
  const handleBackToLanding = useCallback(() => setView('landing'), []);
  const handleBackToEditor = useCallback(() => setView('editor'), []);

  const handleGoHome = useCallback(() => {
    // Clear share param from URL
    if (window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setView('landing');
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <ThemeContext.Provider value={themeCtx}>
        <MobileWarning />
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={themeCtx}>
      <div className="min-h-screen font-sans flex flex-col">
        {/* Error toast */}
        {errorMessage && (
          <div className="fixed top-4 right-4 z-50 bg-red-900/90 border border-red-700 text-red-200 px-4 py-3 rounded shadow-xl flex items-center gap-3 max-w-md animate-fade-in">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-300 hover:text-white ml-2">✕</button>
          </div>
        )}

        {/* History modal */}
        {showHistory && (
          <HistoryPanel
            history={history}
            onClose={() => setShowHistory(false)}
            onClear={() => { clearHistory(); setHistory([]); }}
          />
        )}

        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center bg-[#0b1120]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <span className="text-slate-400 font-mono text-sm tracking-widest uppercase animate-pulse">Initializing System...</span>
            </div>
          </div>
        }>
          {/* Views */}
          {view === 'shared' && shareId ? (
            <SharedView shareId={shareId} onGoHome={handleGoHome} />
          ) : view === 'dashboard' && analysisResult ? (
            <DashboardView
              result={analysisResult}
              onNewAnalysis={handleBackToEditor}
              onReanalyze={handleReanalyze}
              isReanalyzing={isAnalyzing}
            />
          ) : (
            <>
              {/* Editor is always rendered in background for landing/editor views */}
              <div className="absolute inset-0 z-0">
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
                  onBack={handleBackToLanding}
                  onShowHistory={() => setShowHistory(true)}
                  isAnalyzing={isAnalyzing}
                  hasValidReport={hasValidReport}
                  rateLimit={rateLimit}
                />
              </div>

              {/* Landing Page Overlay */}
              {view === 'landing' && (
                <div className="absolute inset-0 z-50">
                  <LandingPage onGetStarted={handleGetStarted} />
                </div>
              )}
            </>
          )}
        </Suspense>
      </div>
    </ThemeContext.Provider>
  );
};
