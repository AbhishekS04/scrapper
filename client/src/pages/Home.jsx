import URLInput from '../components/URLInput.jsx';
import ProgressPanel from '../components/ProgressPanel.jsx';
import ResultsTabs from '../components/ResultsTabs.jsx';
import ExportBar from '../components/ExportBar.jsx';
import { useScrapeJob } from '../hooks/useScrapeJob.js';

export default function Home() {
  const { jobId, jobData, loading, error, progress, status, stats, startScrape, reset } = useScrapeJob();

  const showHero = status === 'idle';

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      {showHero && (
        <div className="relative flex flex-col items-center justify-center pt-12 sm:pt-24 pb-8 sm:pb-14 px-4 sm:px-6 animate-fade-in">
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo badge */}
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight text-center mb-3 sm:mb-4">
              <span className="text-white">Scrape</span>
              <span className="text-gray-500">It</span>
            </h1>

            <p className="text-gray-400 text-sm sm:text-lg md:text-xl mb-2 text-center max-w-2xl px-2">
              Web intelligence & data extraction platform
            </p>
            <p className="text-gray-600 text-xs sm:text-sm mb-8 sm:mb-14 text-center max-w-lg px-2">
              Extract links, images, metadata, contacts, tech stack, security headers, scripts, and more.
            </p>
          </div>
        </div>
      )}

      {/* Compact header when scraping */}
      {!showHero && (
        <div className="pt-4 sm:pt-8 pb-2 sm:pb-4 px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            Scrape<span className="text-gray-500">It</span>
          </h2>
          {status === 'completed' && (
            <button onClick={reset} className="text-xs text-gray-500 hover:text-white transition-colors mt-2 flex items-center gap-1.5 mx-auto">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              New Scrape
            </button>
          )}
        </div>
      )}

      {/* URL Input */}
      <div className="px-4 sm:px-6 relative z-10">
        <URLInput onSubmit={startScrape} loading={status === 'running'} />
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto mt-4 sm:mt-6 px-4 sm:px-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 text-red-400 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Progress Panel */}
      <div className="px-4 sm:px-6">
        <ProgressPanel progress={progress} stats={stats} status={status} />
      </div>

      {/* Results */}
      {jobData && (
        <div className="px-4 sm:px-6 pb-12 sm:pb-16">
          <ResultsTabs jobData={jobData} />
          <ExportBar jobId={jobId} jobData={jobData} />
        </div>
      )}

      {/* Feature cards on hero */}
      {showHero && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-16 sm:pb-24 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              {
                icon: '⚡',
                title: 'Lightning Fast',
                desc: 'Smart engine: Axios for static pages, Playwright for JS-heavy sites.',
              },
              {
                icon: '🔓',
                title: 'Leak Detection',
                desc: 'High-accuracy scan for exposed API keys, tokens, passwords, AWS secrets.',
              },
              {
                icon: '🛡️',
                title: 'Security Audit',
                desc: 'Check HTTP security headers, CSP, HSTS, and vulnerability indicators.',
              },
              {
                icon: '📊',
                title: 'Full Extraction',
                desc: 'Links, images, scripts, forms, tables, contacts, metadata, tech stack.',
              },
            ].map(card => (
              <div key={card.title} className="glass-panel-hover p-4 sm:p-6 group/card">
                <div className="text-xl sm:text-2xl mb-2 sm:mb-4 w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-white/[0.04]">{card.icon}</div>
                <h3 className="text-white font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">{card.title}</h3>
                <p className="text-gray-500 text-[10px] sm:text-xs leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom info bar */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-[10px] sm:text-[11px] text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              Deep crawling up to 5 levels
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              Results stored in NeonDB
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              Export JSON / CSV
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
