import { useState, useRef, useEffect } from 'react';

const TAG_COLORS = {
  a: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  img: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  h1: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  h2: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  h3: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  p: 'bg-gray-500/10 text-gray-300 border-gray-500/20',
  button: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  span: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
  li: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  td: 'bg-pink-500/15 text-pink-300 border-pink-500/20',
};

export default function VisualSelector() {
  const [url, setUrl] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pendingSelector, setPendingSelector] = useState(null);
  const [selectorName, setSelectorName] = useState('');
  const [selectors, setSelectors] = useState([]);
  const [scraping, setScraping] = useState(false);
  const [scrapeResults, setScrapeResults] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [loadedUrl, setLoadedUrl] = useState('');
  const iframeRef = useRef(null);

  // Listen for element picks from the iframe via postMessage
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type !== 'vs:picked') return;
      setPendingSelector(e.data);
      const tagLabel = {
        a: 'Link', img: 'Image', h1: 'Heading', h2: 'Heading', h3: 'Heading',
        h4: 'Heading', p: 'Paragraph', span: 'Text', button: 'Button',
        li: 'List Item', td: 'Table Cell', th: 'Header Cell', input: 'Input',
        select: 'Select', label: 'Label', div: 'Section',
      };
      setSelectorName(tagLabel[e.data.tag] || e.data.tag?.toUpperCase() || 'Element');
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const loadPage = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setPicking(false);
    setPendingSelector(null);
    setScrapeResults(null);
    setSelectors([]);
    const fullUrl = url.startsWith('http') ? url : 'https://' + url;
    setLoadedUrl(fullUrl);
    setLoading(true);
    setIframeSrc(`/api/proxy?url=${encodeURIComponent(fullUrl)}`);
  };

  const togglePick = () => {
    const next = !picking;
    setPicking(next);
    setPendingSelector(null);
    iframeRef.current?.contentWindow?.postMessage(next ? 'vs:on' : 'vs:off', '*');
  };

  const confirmSelector = () => {
    if (!pendingSelector || !selectorName.trim()) return;
    setSelectors(prev => [...prev, {
      id: Date.now(),
      name: selectorName.trim(),
      selector: pendingSelector.selector,
      tag: pendingSelector.tag,
      sample: pendingSelector.text,
      count: pendingSelector.count,
    }]);
    setPendingSelector(null);
    setSelectorName('');
  };

  const removeSelector = (id) => setSelectors(prev => prev.filter(s => s.id !== id));

  const handleScrape = async () => {
    if (!selectors.length || !loadedUrl) return;
    setScraping(true);
    setScrapeResults(null);
    try {
      const res = await fetch('/api/selector-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: loadedUrl, selectors: selectors.map(s => ({ name: s.name, selector: s.selector })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScrapeResults(data.results);
      setActiveResult(Object.keys(data.results)[0] || null);
    } catch (err) { alert('Scrape failed: ' + err.message); }
    setScraping(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* URL Bar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] bg-dark-950/80 backdrop-blur-xl">
        <form onSubmit={loadPage} className="flex items-center gap-2 max-w-7xl mx-auto flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-0 flex items-center gap-2 bg-dark-800/60 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-gray-600 text-sm">🌐</span>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none font-mono min-w-0"
            />
          </div>

          <button type="submit"
            className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-all flex-shrink-0">
            Load
          </button>

          {iframeSrc && (
            <button type="button" onClick={togglePick}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 border ${
                picking
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 animate-pulse'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}>
              {picking ? '🖱️ Click an element…' : '🎯 Pick Element'}
            </button>
          )}

          {selectors.length > 0 && (
            <button type="button" onClick={handleScrape} disabled={scraping}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold transition-all flex-shrink-0 flex items-center gap-2 disabled:opacity-50">
              {scraping
                ? <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Extracting…</>
                : `⚡ Extract ${selectors.length} selector${selectors.length > 1 ? 's' : ''}`}
            </button>
          )}
        </form>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Iframe / empty state */}
        <div className="flex-1 relative overflow-hidden bg-white">
          {!iframeSrc ? (
            <div className="h-full flex items-center justify-center flex-col gap-4 text-gray-600 bg-dark-950">
              <div className="text-6xl">🎯</div>
              <p className="text-xl text-gray-400 font-semibold">Visual Element Selector</p>
              <p className="text-sm text-center max-w-sm text-gray-600 leading-relaxed">
                Enter any URL above and click <span className="text-white font-medium">Load</span>.<br />
                The page loads right here. Then click <span className="text-emerald-400 font-medium">Pick Element</span> and click anything on the page to capture its CSS selector.
              </p>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-900/70 z-20 backdrop-blur-sm">
                  <div className="flex items-center gap-3 bg-dark-800 px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
                    <svg className="animate-spin w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span className="text-sm text-white">Loading page…</span>
                  </div>
                </div>
              )}

              {picking && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-indigo-600 text-white text-xs px-5 py-2.5 rounded-full shadow-2xl pointer-events-none whitespace-nowrap font-medium">
                  🎯 Click any element on the page to select it
                </div>
              )}

              <iframe
                ref={iframeRef}
                src={iframeSrc}
                title="Visual Selector Preview"
                className={`w-full h-full border-0 ${picking ? 'pointer-events-auto cursor-crosshair' : ''}`}
                onLoad={() => setLoading(false)}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-80 flex-shrink-0 border-l border-white/[0.06] bg-dark-950 flex flex-col overflow-hidden">

          {/* Pending confirm */}
          {pendingSelector && (
            <div className="flex-shrink-0 p-3 border-b border-emerald-500/20 bg-emerald-500/5">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-2">Element Selected</div>

              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${TAG_COLORS[pendingSelector.tag] || 'bg-gray-500/10 text-gray-300 border-gray-500/20'}`}>
                  &lt;{pendingSelector.tag}&gt;
                </span>
                {pendingSelector.count > 0 && (
                  <span className="text-[10px] text-gray-500">{pendingSelector.count} match{pendingSelector.count !== 1 ? 'es' : ''} on page</span>
                )}
              </div>

              <div className="font-mono text-[11px] text-indigo-300 bg-indigo-500/10 rounded-lg px-2.5 py-2 mb-2 break-all leading-relaxed border border-indigo-500/15">
                {pendingSelector.selector}
              </div>

              {pendingSelector.text && (
                <div className="text-[11px] text-gray-500 mb-2 truncate italic">"{pendingSelector.text}"</div>
              )}

              <input
                type="text"
                value={selectorName}
                onChange={e => setSelectorName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmSelector()}
                placeholder="Name this selector…"
                autoFocus
                className="w-full bg-dark-800/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/40 mb-2"
              />
              <div className="flex gap-2">
                <button onClick={confirmSelector} className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-400 transition-all">
                  ✓ Add Selector
                </button>
                <button onClick={() => setPendingSelector(null)} className="px-3 py-2 rounded-lg text-gray-500 text-xs hover:text-white transition-colors">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Selector list */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-3">
              {selectors.length === 0
                ? 'No selectors yet'
                : `${selectors.length} selector${selectors.length > 1 ? 's' : ''}`}
            </div>

            {selectors.length === 0 && iframeSrc && (
              <div className="text-center py-6 text-gray-700 text-xs leading-relaxed">
                Click <span className="text-white">Pick Element</span> then<br/>click anything on the page
              </div>
            )}

            <div className="space-y-2">
              {selectors.map(s => (
                <div key={s.id} className="bg-dark-800/40 border border-white/5 rounded-xl p-3 group">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">{s.name}</div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border inline-block mt-0.5 ${TAG_COLORS[s.tag] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        &lt;{s.tag}&gt;
                      </span>
                    </div>
                    <button onClick={() => removeSelector(s.id)}
                      className="p-1 rounded text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="font-mono text-[10px] text-indigo-400/80 break-all leading-relaxed">
                    {s.selector}
                  </div>
                  {s.count > 0 && <div className="text-[10px] text-gray-600 mt-1">{s.count} element{s.count !== 1 ? 's' : ''} on page</div>}
                  {s.sample && <div className="text-[10px] text-gray-600 mt-0.5 truncate italic">"{s.sample}"</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {scrapeResults && (
            <div className="flex-shrink-0 border-t border-white/[0.06] max-h-72 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04] flex-shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Results</span>
                <button onClick={() => navigator.clipboard.writeText(JSON.stringify(scrapeResults, null, 2))}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
                  Copy JSON
                </button>
              </div>
              <div className="flex border-b border-white/[0.04] overflow-x-auto flex-shrink-0">
                {Object.keys(scrapeResults).map(k => (
                  <button key={k} onClick={() => setActiveResult(k)}
                    className={`px-3 py-1.5 text-[11px] font-medium flex-shrink-0 transition-colors whitespace-nowrap ${activeResult === k ? 'text-white border-b-2 border-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}>
                    {k} ({scrapeResults[k]?.length || 0})
                  </button>
                ))}
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
                {(scrapeResults[activeResult] || []).map((item, i) => (
                  <div key={i} className="bg-dark-800/40 rounded-lg p-2 text-[11px]">
                    <div className="text-gray-300 truncate">{item.text || item.src || item.href || '(empty)'}</div>
                    {item.href && <div className="text-blue-400 text-[10px] truncate mt-0.5">{item.href}</div>}
                  </div>
                ))}
                {!scrapeResults[activeResult]?.length && (
                  <div className="text-gray-600 text-xs text-center py-4">No elements matched</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
