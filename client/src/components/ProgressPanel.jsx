import { useEffect, useRef, useState } from 'react';

export default function ProgressPanel({ progress, stats, status }) {
  const logRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [progress]);

  // Elapsed timer
  useEffect(() => {
    if (status === 'running') {
      startRef.current = Date.now();
      const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
      return () => clearInterval(timer);
    }
  }, [status]);

  if (status === 'idle') return null;

  const getIcon = (type) => {
    switch (type) {
      case 'fetching': return '⟩';
      case 'parsing': return '⊕';
      case 'storing': return '↓';
      case 'scraped': return '✓';
      case 'error': return '✗';
      case 'completed': return '★';
      case 'failed': return '✗';
      case 'status': return '●';
      default: return '·';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'fetching': return 'text-gray-300';
      case 'parsing': return 'text-gray-300';
      case 'storing': return 'text-gray-400';
      case 'scraped': return 'text-white';
      case 'error': return 'text-red-400';
      case 'completed': return 'text-white';
      case 'failed': return 'text-red-400';
      case 'status': return 'text-amber-400';
      default: return 'text-gray-500';
    }
  };

  const getMessage = (entry) => {
    switch (entry.type) {
      case 'fetching': return `Fetching ${entry.url}`;
      case 'parsing': return `Parsing ${entry.url} (${entry.loadTimeMs}ms)`;
      case 'storing': return `Storing data for ${entry.url}`;
      case 'scraped': return `✓ Scraped: ${entry.title || entry.url}`;
      case 'error': return `Error: ${entry.url} — ${entry.message}`;
      case 'completed': return `Job completed! ${entry.pagesScraped} pages scraped.`;
      case 'failed': return `Job failed: ${entry.message}`;
      case 'status': return entry.message;
      default: return JSON.stringify(entry);
    }
  };

  const percentage = Math.min(stats.percentage, 100);
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 sm:mt-8 animate-slide-up">
      <div className="glass-panel overflow-hidden relative">
        {/* Scanline effect when running */}
        {status === 'running' && <div className="scanline absolute inset-0 pointer-events-none z-10" />}

        {/* Header */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/[0.06] flex items-center justify-between relative z-20">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Status indicator */}
            <div className="relative flex items-center">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                status === 'running' ? 'bg-white' :
                status === 'completed' ? 'bg-white' :
                status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
              }`}>
                {status === 'running' && (
                  <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-30" />
                )}
              </div>
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-gray-400 uppercase tracking-wider">
              {status === 'running' ? 'Live Scan' : status === 'completed' ? 'Scan Complete' : status === 'failed' ? 'Scan Failed' : 'Status'}
            </span>
            {status === 'running' && (
              <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 bg-white/[0.05] px-1.5 sm:px-2 py-0.5 rounded-md">
                {formatTime(elapsed)}
              </span>
            )}
          </div>

          {/* Live stats */}
          <div className="flex items-center gap-2 sm:gap-5 text-[10px] sm:text-xs font-mono">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white" />
              <span className="text-gray-500 hidden sm:inline">Pages</span>
              <span className="text-white font-bold">{stats.pagesScraped}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gray-400" />
              <span className="text-gray-500 hidden sm:inline">Found</span>
              <span className="text-gray-300 font-bold">{stats.totalFound}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-gray-500">{percentage}%</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-dark-700 relative overflow-hidden">
          <div className="absolute inset-0 shimmer opacity-30" />
          <div
            className="h-full transition-all duration-700 ease-out relative bg-white"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/60 to-transparent" />
          </div>
        </div>

        {/* Log stream */}
        <div ref={logRef} className="h-40 sm:h-52 overflow-y-auto p-3 sm:p-4 font-mono text-[10px] sm:text-xs space-y-1 relative z-20">
          {progress.length === 0 ? (
            <div className="text-gray-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full radar-sweep" />
              <span>Initializing scrape engine...</span>
            </div>
          ) : (
            progress.map((entry, i) => (
              <div key={i} className={`flex items-start gap-2 ${getColor(entry.type)} animate-fade-in`}>
                <span className="flex-shrink-0 w-4 text-center opacity-70 mt-0.5">{getIcon(entry.type)}</span>
                <span className="text-gray-600 flex-shrink-0 w-12 sm:w-16 opacity-50">
                  {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="opacity-90 break-all">{getMessage(entry)}</span>
              </div>
            ))
          )}
          {status === 'running' && (
            <div className="text-gray-500 cursor-blink" />
          )}
        </div>

        {/* Bottom status bar */}
        {status === 'completed' && (
          <div className="px-3 sm:px-5 py-2 sm:py-2.5 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.03]">
            <div className="flex items-center gap-2 text-white text-[11px] sm:text-xs font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Scan completed successfully
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              {stats.pagesScraped} pages · {elapsed > 0 ? formatTime(elapsed) : '—'}
            </span>
          </div>
        )}
        {status === 'failed' && (
          <div className="px-3 sm:px-5 py-2 sm:py-2.5 border-t border-red-500/20 flex items-center gap-2 bg-red-500/[0.03] text-red-400 text-[11px] sm:text-xs font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Scan failed — check logs above for details
          </div>
        )}
      </div>
    </div>
  );
}
