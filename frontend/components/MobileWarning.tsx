import React from 'react';
import { VERSION } from '../constants';

export const MobileWarning: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        {/* Branding */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold tracking-tight text-white">
            Codalyzer <span className="text-blue-500 text-[10px] font-mono font-normal ml-0.5 opacity-70">// v{VERSION}</span>
          </h1>
        </div>

        {/* Main Message Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-800 rounded-lg p-5 shadow-2xl">
          <h2 className="text-lg font-bold text-white text-center mb-3">
            Desktop Experience Required
          </h2>
          
          <p className="text-slate-300 text-center text-sm mb-4 leading-relaxed">
            Codalyzer's code analysis interface requires a larger screen for the best experience. 
            The canvas-based editor and multi-panel workflow are optimized for desktop use.
          </p>

          <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-3 mb-4">
            <p className="text-blue-200 text-xs text-center">
              <strong className="text-blue-100">Mobile design is under development</strong> and will be available soon.
            </p>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <p className="text-slate-400 text-xs text-center leading-relaxed">
              Please open this page on a <strong className="text-white">desktop or laptop computer</strong> with a screen width of at least <strong className="text-white">1024px</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
