import { useState, useRef, useEffect } from 'react';

const SCAN_PRESETS = [
  { key: 'quick', label: 'Quick Scan', desc: 'Single page, basic extraction', icon: '⚡', depth: 1, options: { deepScan: false, followLinks: false } },
  { key: 'standard', label: 'Standard', desc: 'Follow links, 2 levels deep', icon: '🔍', depth: 2, options: { deepScan: false, followLinks: true } },
  { key: 'deep', label: 'Deep Scan', desc: 'Full crawl, 4 levels deep', icon: '🕵️', depth: 4, options: { deepScan: true, followLinks: true } },
];

const OPTION_GROUPS = [
  {
    title: 'Extraction',
    items: [
      { key: 'extractImages', label: 'Images', icon: '🖼️', desc: 'Extract all images with alt text' },
      { key: 'extractEmailsOpt', label: 'Emails & Phones', icon: '📬', desc: 'Find contact information' },
      { key: 'extractScripts', label: 'Scripts & CSS', icon: '📜', desc: 'Extract all scripts & stylesheets' },
      { key: 'extractComments', label: 'HTML Comments', icon: '💬', desc: 'Find developer comments in source' },
      { key: 'extractDownloads', label: 'Downloadables', icon: '📥', desc: 'Find PDFs, docs, archives' },
    ],
  },
  {
    title: 'Security & Leak Detection',
    items: [
      { key: 'detectLeaks', label: 'Leak Scanner', icon: '🔓', desc: 'Scan for exposed API keys, tokens, secrets' },
      { key: 'securityAudit', label: 'Security Headers', icon: '🛡️', desc: 'Audit HTTP security headers' },
      { key: 'extractHidden', label: 'Hidden Fields', icon: '👁️‍🗨️', desc: 'Find hidden form inputs (CSRF, tokens)' },
      { key: 'extractIframes', label: 'Iframes', icon: '📦', desc: 'Detect embedded iframes' },
    ],
  },
];

export default function URLInput({ onSubmit, loading }) {
  const [url, setUrl] = useState('');
  const [protocol, setProtocol] = useState('https://');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activePreset, setActivePreset] = useState('standard');
  const [options, setOptions] = useState({
    deepScan: false,
    followLinks: true,
    extractImages: true,
    extractEmailsOpt: true,
    extractScripts: true,
    extractComments: true,
    extractDownloads: true,
    detectLeaks: true,
    securityAudit: true,
    extractHidden: true,
    extractIframes: true,
    depth: 2,
  });
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loading && inputRef.current) inputRef.current.focus();
  }, [loading]);

  const handleUrlChange = (e) => {
    let value = e.target.value;
    // Auto-detect protocol when pasting a full URL
    if (value.startsWith('https://')) {
      setProtocol('https://');
      value = value.slice(8);
    } else if (value.startsWith('http://')) {
      setProtocol('http://');
      value = value.slice(7);
    }
    setUrl(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    const finalUrl = protocol + url.trim();
    onSubmit(finalUrl, options);
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.key);
    setOptions(prev => ({
      ...prev,
      ...preset.options,
      depth: preset.depth,
    }));
  };

  const toggleOption = (key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    setActivePreset('custom');
  };

  const allEnabled = OPTION_GROUPS.flatMap(g => g.items).every(item => options[item.key]);
  const toggleAll = () => {
    const newVal = !allEnabled;
    const updates = {};
    OPTION_GROUPS.flatMap(g => g.items).forEach(item => { updates[item.key] = newVal; });
    setOptions(prev => ({ ...prev, ...updates }));
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      {/* ─── Main URL Input ─── */}
      <div className="relative group">
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2">
            {/* Globe icon */}
            <div className="pl-5 text-gray-500">
              <div className="relative w-6 h-6">
                <svg className={`w-6 h-6 transition-colors ${url ? 'text-white' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full radar-sweep" />
                  </div>
                )}
              </div>
            </div>

            {/* Protocol selector */}
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="bg-transparent text-gray-400 text-lg font-mono py-4 focus:outline-none cursor-pointer hover:text-white transition-colors"
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
              placeholder="example.com"
              className="flex-1 bg-transparent text-white text-lg font-mono placeholder-gray-600 py-4 px-1 focus:outline-none"
              disabled={loading}
            />

            {/* Settings toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-3 mx-1 rounded-xl transition-all duration-300 ${showAdvanced ? 'bg-white/[0.1] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="m-2 px-7 py-3 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-white text-dark-950 hover:bg-gray-200 active:scale-[0.97]"
            >
              <span className="flex items-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Scanning
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    Scrape
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Progress bar under input */}
          {loading && (
            <div className="h-0.5 w-full shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          )}
        </div>
      </div>

      {/* ─── Quick Presets Row ─── */}
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        {SCAN_PRESETS.map(preset => (
          <button
            key={preset.key}
            type="button"
            onClick={() => applyPreset(preset)}
            className={`group/preset flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 border ${
              activePreset === preset.key
                ? 'bg-white/[0.1] text-white border-white/[0.2]'
                : 'bg-dark-800/60 text-gray-500 border-dark-600 hover:text-gray-300 hover:border-dark-500'
            }`}
          >
            <span className="text-sm">{preset.icon}</span>
            <div className="text-left">
              <div>{preset.label}</div>
              <div className="text-[10px] opacity-60 font-normal">{preset.desc}</div>
            </div>
          </button>
        ))}

        {/* Depth control */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800/60 border border-dark-600 text-xs">
          <span className="text-gray-500">Depth</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => { setOptions(prev => ({ ...prev, depth: d })); setActivePreset('custom'); }}
                className={`w-7 h-7 rounded-lg text-xs font-mono transition-all duration-200 ${
                  options.depth === d
                    ? 'bg-white/[0.15] text-white border border-white/[0.2]'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Advanced Options Panel ─── */}
      <div className={`overflow-hidden transition-all duration-500 ease-out ${showAdvanced ? 'max-h-[600px] opacity-100 mt-5' : 'max-h-0 opacity-0'}`}>
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-200 tracking-wide flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.004.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Advanced Options
            </h3>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-white/[0.05]"
            >
              {allEnabled ? 'Disable All' : 'Enable All'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {OPTION_GROUPS.map(group => (
              <div key={group.title}>
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold mb-3 flex items-center gap-2">
                  {group.title === 'Security & Leak Detection' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                  {group.title}
                </h4>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleOption(item.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs transition-all duration-200 text-left ${
                        options[item.key]
                          ? 'bg-white/[0.05] text-gray-200 border border-white/[0.1]'
                          : 'text-gray-500 border border-transparent hover:bg-white/[0.03] hover:text-gray-400'
                      }`}
                    >
                      <span className="text-base w-6 flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-[10px] opacity-50 mt-0.5 truncate">{item.desc}</div>
                      </div>
                      <div className={`w-8 h-5 rounded-full transition-all duration-300 flex items-center ${
                        options[item.key] ? 'bg-white/30 justify-end' : 'bg-dark-600 justify-start'
                      }`}>
                        <div className={`w-3.5 h-3.5 rounded-full mx-0.5 transition-all duration-300 ${
                          options[item.key] ? 'bg-white' : 'bg-dark-500'
                        }`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
