import React, { useEffect, useState } from 'react';
import { AnalysisResult } from '../types';
import { getShare, ApiError } from '../services/apiService';
import { DashboardView } from './DashboardView';
import { useTheme } from '../hooks/useTheme';
import { Loader2, AlertTriangle, Layout, ArrowRight } from 'lucide-react';
import { VERSION } from '../constants';

interface SharedViewProps {
  shareId: string;
  onGoHome: () => void;
}

export const SharedView: React.FC<SharedViewProps> = ({ shareId, onGoHome }) => {
  const { isDark } = useTheme();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getShare(shareId);
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load shared result');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shareId]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0b1120]' : 'bg-slate-50'}`}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading shared analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0b1120]' : 'bg-slate-50'}`}>
        <div className="text-center max-w-sm">
          <AlertTriangle size={32} className="text-amber-500 mx-auto mb-4" />
          <h2 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Share Not Found
          </h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {error || 'This share link may have expired or is invalid.'}
          </p>
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go to Codalyzer <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      result={result}
      onNewAnalysis={onGoHome}
      onReanalyze={() => {}}
      isReanalyzing={false}
    />
  );
};
