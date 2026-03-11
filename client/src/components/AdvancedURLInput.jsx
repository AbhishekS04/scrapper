import { useState, useRef, useEffect } from 'react';

export default function AdvancedURLInput({ onSubmit, loading }) {
  const [url, setUrl] = useState('');
  const [protocol, setProtocol] = useState('https://');
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loading && inputRef.current) inputRef.current.focus();
  }, [loading]);

  const handleUrlChange = (e) => {
    let value = e.target.value;
    if (value.startsWith('https://')) { setProtocol('https://'); value = value.slice(8); }
    else if (value.startsWith('http://')) { setProtocol('http://'); value = value.slice(7); }
    setUrl(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(protocol + url.trim(), {
      deepScan: false, followLinks: false, extractImages: false,
      extractEmailsOpt: false, extractScripts: false, extractComments: false,
      extractDownloads: false, detectLeaks: false, securityAudit: false,
      extractHidden: false, extractIframes: false, siteIntel: true,
      brutalMode: true, browserIntel: false, contentAnalysis: true,
      cmsDetection: false, checkBrokenLinks: false, depth: 1,
      aiPrompt: prompt.trim(),
    });
  };

  const presetPrompts = [
    'Extract all pricing plans, their costs, and top 3 features each.',
    'Find all key personnel (CEO, founders) and their contact info.',
    'Summarize the business and list their core products or services.',
    'Extract all FAQ questions and their answers.',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">AI Extraction Mode</h2>
          <p className="text-gray-600 text-xs">Tell the AI exactly what data you want from this website.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* URL Input */}
        <div className="glass-panel rounded-xl flex items-center p-1 border border-white/[0.08] overflow-hidden">
          <div className="pl-3 text-gray-600 flex-shrink-0">
            <svg className={`w-4 h-4 transition-colors ${url ? 'text-indigo-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            className="bg-transparent text-gray-500 text-sm font-mono py-3 px-2 focus:outline-none hover:text-gray-300 transition-colors cursor-pointer appearance-none"
            disabled={loading}
          >
            <option value="https://" className="bg-dark-900 text-white">https://</option>
            <option value="http://" className="bg-dark-900 text-white">http://</option>
          </select>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="target-website.com"
            className="flex-1 min-w-0 bg-transparent text-white text-sm font-mono placeholder-gray-600 py-3 focus:outline-none"
            disabled={loading}
          />
        </div>

        {/* AI Prompt Textarea */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Extract the names, roles, and emails of the leadership team and return them as a JSON list."
            className="w-full h-28 glass-panel rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/10 resize-none text-sm leading-relaxed border border-white/[0.06] transition-all"
            disabled={loading}
          />
          {/* Character count */}
          {prompt.length > 0 && (
            <span className="absolute bottom-3 right-3 text-[10px] text-gray-700">{prompt.length}</span>
          )}
        </div>

        {/* Preset prompts */}
        <div className="flex flex-wrap gap-2">
          {presetPrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(p)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-gray-500 border border-white/[0.06] hover:text-gray-300 hover:bg-white/[0.07] transition-all"
              disabled={loading}
            >
              {p.length > 38 ? p.slice(0, 37) + '…' : p}
            </button>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading || !url.trim() || !prompt.trim()}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Extracting…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Start AI Extraction
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
