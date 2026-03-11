import { useState } from 'react';

export default function SemanticSearchTab({ jobId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState('');
  const [indexed, setIndexed] = useState(false);

  const handleIndex = async () => {
    setIndexing(true);
    setError('');
    try {
      const res = await fetch(`/api/search/${jobId}/index`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIndexed(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setIndexing(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch(`/api/search/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), topK: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityLabel = (score) => {
    if (score >= 0.85) return { text: 'Perfect match', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 0.75) return { text: 'High match', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
    if (score >= 0.60) return { text: 'Good match', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' };
    return { text: 'Partial match', color: 'text-gray-400', bg: 'bg-white/5 border-white/10' };
  };

  const presetQueries = [
    'What does this website sell or offer?',
    'Find all pricing and subscription plans',
    'Who is the target audience of this site?',
    'What are the main features or benefits?',
    'Find contact information and support details',
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">🔍</span>
            Semantic Search
          </h3>
          <p className="text-gray-500 text-xs mt-1">
            Ask natural language questions about the scraped content. AI ranks pages by relevance to your query.
          </p>
        </div>
        {/* Index button */}
        <button
          onClick={handleIndex}
          disabled={indexing || indexed}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
            indexed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default'
              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20'
          } disabled:opacity-50`}
        >
          {indexing ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Indexing...
            </>
          ) : indexed ? (
            <>✅ Indexed</>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Build Index
            </>
          )}
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. What services does this company offer?"
            className="w-full bg-dark-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        {/* Preset queries */}
        <div className="flex flex-wrap gap-2">
          {presetQueries.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setQuery(q)}
              className="text-[10px] px-2.5 py-1.5 rounded-lg bg-dark-700/60 text-gray-500 border border-white/5 hover:text-gray-300 hover:bg-dark-700 transition-colors"
            >
              {q.length > 35 ? q.slice(0, 34) + '…' : q}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching...
            </>
          ) : (
            <>
              <span>🔍</span> Search
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm flex items-start gap-2">
          <span className="flex-shrink-0">⚠️</span>
          {error}
          {error.includes('index') || error.includes('embed') ? (
            <span className="ml-1 text-gray-500">— Try clicking <strong className="text-white">Build Index</strong> first.</span>
          ) : null}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            {results.matches.length} pages matched your query out of {results.totalResults} total
          </div>

          {results.matches.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="text-3xl mb-2">🔎</div>
              <p>No matching pages found. Try a different query or click <strong className="text-white">Build Index</strong> first.</p>
            </div>
          ) : (
            results.matches.map((match, i) => {
              const label = getSimilarityLabel(match.score);
              return (
                <div key={match.id || i} className={`border rounded-xl p-4 transition-all ${label.bg}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-600 font-mono">#{i + 1}</span>
                        <h4 className="text-sm font-semibold text-white truncate">
                          {match.title || 'Untitled page'}
                        </h4>
                      </div>
                      <a
                        href={match.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 truncate block transition-colors mt-0.5"
                      >
                        {match.pageUrl}
                      </a>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${label.color} ${label.bg}`}>
                        {label.text}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1 font-mono">
                        {(match.score * 100).toFixed(1)}% match
                      </div>
                    </div>
                  </div>
                  {match.snippet && (
                    <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
                      {match.snippet}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="text-center py-12 text-gray-600">
          <div className="text-4xl mb-3">🧠</div>
          <p className="text-sm">Type a question above to search the scraped content semantically.</p>
          <p className="text-xs mt-1 text-gray-700">Works best after clicking <span className="text-gray-500">Build Index</span> first.</p>
        </div>
      )}
    </div>
  );
}
