import React from 'react';
import { HistoryEntry } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Clock, X, FileCode } from 'lucide-react';

interface HistoryPanelProps {
  history: HistoryEntry[];
  onClose: () => void;
  onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onClose, onClear }) => {
  const { isDark } = useTheme();

  const bg = isDark ? 'bg-[#0b1120]' : 'bg-white';
  const border = isDark ? 'border-slate-800' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className={`relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl border shadow-2xl ${bg} ${border}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            <h2 className={`font-bold ${textPrimary}`}>Analysis History</h2>
            <span className={`text-xs ${textMuted}`}>({history.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClear}
                className={`text-xs px-2 py-1 rounded transition-colors ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'}`}
              >
                Clear All
              </button>
            )}
            <button onClick={onClose} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
              <X size={16} className={textMuted} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {history.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 ${textMuted}`}>
              <Clock size={28} className="mb-3 opacity-40" />
              <p className="text-sm">No analysis history yet</p>
              <p className="text-xs mt-1 opacity-60">Run an analysis to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(entry => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${isDark ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                >
                  <FileCode size={16} className="text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${textPrimary}`}>{entry.fileName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                        {entry.language}
                      </span>
                    </div>
                    <div className={`flex items-center gap-3 mt-1 text-xs ${textMuted}`}>
                      <span className="font-mono">{entry.bestCase} → {entry.worstCase}</span>
                      <span>{entry.issueCount} issue{entry.issueCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] shrink-0 ${textMuted}`}>{entry.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
