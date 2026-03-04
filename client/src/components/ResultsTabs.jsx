import { useState } from 'react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '◆' },
  { id: 'suggestions', label: 'Suggestions', icon: '💡' },
  { id: 'links', label: 'Links', icon: '🔗' },
  { id: 'images', label: 'Images', icon: '🖼️' },
  { id: 'text', label: 'Text', icon: '📝' },
  { id: 'scripts', label: 'Scripts & CSS', icon: '📜' },
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'leaks', label: 'Leaked Data', icon: '🔓' },
  { id: 'tables', label: 'Tables', icon: '📋' },
  { id: 'contacts', label: 'Contacts', icon: '📬' },
  { id: 'metadata', label: 'Metadata', icon: '🏷️' },
  { id: 'tech', label: 'Tech Stack', icon: '⚙️' },
  { id: 'seo', label: 'SEO & Schema', icon: '🔍' },
  { id: 'design', label: 'Design Intel', icon: '🎨' },
  { id: 'content', label: 'Content', icon: '📰' },
  { id: 'intel', label: 'Site Intel', icon: '🌐' },
  { id: 'extras', label: 'More', icon: '📦' },
];

export default function ResultsTabs({ jobData }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!jobData || !jobData.results || jobData.results.length === 0) return null;

  const { job, results } = jobData;

  // Aggregate data from all pages
  const allLinks = {
    internal: results.flatMap(r => r.linksInternal || r.links_internal || []),
    external: results.flatMap(r => r.linksExternal || r.links_external || []),
  };
  const allImages = results.flatMap(r => r.images || []);
  const allEmails = [...new Set(results.flatMap(r => r.emails || []))];
  const allPhones = [...new Set(results.flatMap(r => r.phones || []))];
  const allSocial = (() => {
    const seen = new Set();
    return results.flatMap(r => r.socialLinks || r.social_links || []).filter(s => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  })();
  const allScripts = results.flatMap(r => r.scripts || []);
  const allStylesheets = results.flatMap(r => r.stylesheets || []);
  const allComments = results.flatMap(r => r.comments || []);
  const allLeaked = results.map(r => r.leakedData || r.leaked_data || {});
  const allSecurity = results.map(r => r.securityInfo || r.security_info || {});
  const allHidden = results.flatMap(r => r.hiddenFields || r.hidden_fields || []);
  const allIframes = results.flatMap(r => r.iframes || []);
  const allDownloads = results.flatMap(r => r.downloads || []);
  const allVideos = results.flatMap(r => r.videos || []);
  const allSuggestions = results.flatMap(r => r.suggestions || []);

  // Aggregate contact info from all pages
  const allContactInfo = (() => {
    const contacts = results.map(r => r.contactInfo || r.contact_info || {});
    return {
      names: [...new Set(contacts.flatMap(c => c.names || []))],
      addresses: [...new Set(contacts.flatMap(c => c.addresses || []))],
      locations: [...new Set(contacts.flatMap(c => c.locations || []))],
      websites: [...new Set(contacts.flatMap(c => c.websites || []))],
      roles: [...new Set(contacts.flatMap(c => c.roles || []))],
      raw: contacts.flatMap(c => c.raw || []),
    };
  })();

  // Deduplicate suggestions by title
  const uniqueSuggestions = allSuggestions.filter((s, i, arr) =>
    arr.findIndex(x => x.title === s.title) === i
  );

  // Check if leaks were found
  const hasLeaks = allLeaked.some(l => (l.totalFindings || 0) > 0);

  // ─── ELITE: Aggregate new data ───
  const allRssFeeds = results.flatMap(r => r.rssFeeds || r.rss_feeds || []);
  const allApiEndpoints = results.flatMap(r => r.apiEndpoints || r.api_endpoints || []);
  const allColorPalette = results.map(r => r.colorPalette || r.color_palette || {});
  const allFontInfo = results.map(r => r.fontInfo || r.font_info || {});
  const allPricing = results.flatMap(r => r.pricing || []);
  const allReviews = results.flatMap(r => r.reviews || []);
  const allFaqs = results.flatMap(r => r.faqs || []);
  const allBreadcrumbs = results.flatMap(r => r.breadcrumbs || []);
  const allNavigation = results.map(r => r.navigation || {});
  const allOpenAPIs = results.flatMap(r => r.openAPIs || r.open_apis || []);
  const allFingerprint = results.map(r => r.pageFingerprint || r.page_fingerprint || {});
  const allLanguageInfo = results.map(r => r.languageInfo || r.language_info || {});
  const allCopyright = results.map(r => r.copyright || {});
  const allSchemaOrg = results.map(r => r.schemaOrg || r.schema_org || {});
  const allMicrodata = results.flatMap(r => r.microdata || []);
  const allLinkRelations = results.flatMap(r => r.linkRelations || r.link_relations || []);
  const allResponseHeaders = results.map(r => r.responseHeaders || r.response_headers || {});
  const siteIntel = results.find(r => r.siteIntel && Object.keys(r.siteIntel).length > 0)?.siteIntel
                 || results.find(r => r.site_intel && Object.keys(r.site_intel).length > 0)?.site_intel
                 || {};

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab job={job} results={results} allLinks={allLinks} allImages={allImages} allScripts={allScripts} allLeaked={allLeaked} allSecurity={allSecurity} suggestions={uniqueSuggestions} />;
      case 'suggestions': return <SuggestionsTab suggestions={uniqueSuggestions} />;
      case 'links': return <LinksTab links={allLinks} />;
      case 'images': return <ImagesTab images={allImages} />;
      case 'text': return <TextTab results={results} />;
      case 'scripts': return <ScriptsTab scripts={allScripts} stylesheets={allStylesheets} />;
      case 'security': return <SecurityTab security={allSecurity} />;
      case 'leaks': return <LeaksTab leaked={allLeaked} />;
      case 'tables': return <TablesTab results={results} />;
      case 'contacts': return <ContactsTab emails={allEmails} phones={allPhones} social={allSocial} contactInfo={allContactInfo} />;
      case 'metadata': return <MetadataTab results={results} />;
      case 'tech': return <TechTab results={results} />;
      case 'seo': return <SEOSchemaTab results={results} schemaOrg={allSchemaOrg} microdata={allMicrodata} breadcrumbs={allBreadcrumbs} linkRelations={allLinkRelations} languageInfo={allLanguageInfo} />;
      case 'design': return <DesignIntelTab colorPalette={allColorPalette} fontInfo={allFontInfo} />;
      case 'content': return <ContentTab pricing={allPricing} reviews={allReviews} faqs={allFaqs} rssFeeds={allRssFeeds} copyright={allCopyright} />;
      case 'intel': return <SiteIntelTab siteIntel={siteIntel} apiEndpoints={allApiEndpoints} openAPIs={allOpenAPIs} responseHeaders={allResponseHeaders} fingerprints={allFingerprint} />;
      case 'extras': return <ExtrasTab comments={allComments} hidden={allHidden} iframes={allIframes} downloads={allDownloads} videos={allVideos} />;
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 sm:mt-8 animate-slide-up">
      <div className="glass-panel overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-dark-600/50 px-2 sm:px-4 pt-2 sm:pt-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-0.5 sm:gap-1 min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative ${activeTab === tab.id ? 'tab-button-active' : 'tab-button'}`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
                {/* Alert badge for leaks */}
                {tab.id === 'leaks' && hasLeaks && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                )}
                {tab.id === 'suggestions' && uniqueSuggestions.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-mono">
                    {uniqueSuggestions.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-3 sm:p-6 tab-content-enter" key={activeTab}>
          {renderTab()}
        </div>
      </div>
    </div>
  );
}

/* ─── Overview Tab ────────────────────────────────────────────── */
function OverviewTab({ job, results, allLinks, allImages, allScripts, allLeaked, allSecurity, suggestions }) {
  const firstResult = results[0];
  const totalWords = results.reduce((sum, r) => sum + (r.wordCount || r.word_count || 0), 0);
  const avgLoadTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.loadTimeMs || r.load_time_ms || 0), 0) / results.length)
    : 0;
  const readingTime = Math.max(1, Math.round(totalWords / 200));
  const totalLeaks = allLeaked.reduce((sum, l) => sum + (l.totalFindings || 0), 0);
  const avgSecScore = allSecurity.length > 0
    ? Math.round(allSecurity.reduce((s, sec) => s + (sec.score || 0), 0) / allSecurity.length)
    : 0;

  // Calculate average SEO score
  const seoScores = results.map(r => r.seoScore?.score || r.seo_score?.score || 0).filter(s => s > 0);
  const avgSeoScore = seoScores.length > 0
    ? Math.round(seoScores.reduce((sum, s) => sum + s, 0) / seoScores.length)
    : 0;
  const seoGrade = avgSeoScore >= 90 ? 'A' : avgSeoScore >= 80 ? 'B' : avgSeoScore >= 70 ? 'C' : avgSeoScore >= 60 ? 'D' : 'F';

  const stats = [
    { label: 'SEO Score', value: avgSeoScore > 0 ? `${avgSeoScore}` : '—', color: avgSeoScore >= 80 ? 'text-emerald-400' : avgSeoScore >= 60 ? 'text-amber-400' : avgSeoScore > 0 ? 'text-red-400' : 'text-gray-400', bg: avgSeoScore >= 80 ? 'bg-emerald-500/5 border-emerald-500/10' : avgSeoScore >= 60 ? 'bg-amber-500/5 border-amber-500/10' : avgSeoScore > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-white/[0.03] border-white/[0.06]', badge: avgSeoScore > 0 ? seoGrade : null },
    { label: 'Pages Scraped', value: job.pagesScraped || job.pages_scraped || results.length, color: 'text-white', bg: 'bg-white/[0.03] border-white/[0.06]' },
    { label: 'Total Words', value: totalWords.toLocaleString(), color: 'text-white', bg: 'bg-white/[0.03] border-white/[0.06]' },
    { label: 'Avg Load Time', value: `${avgLoadTime}ms`, color: 'text-gray-300', bg: 'bg-white/[0.03] border-white/[0.06]' },
    { label: 'Internal Links', value: allLinks.internal.length, color: 'text-gray-300', bg: 'bg-white/[0.03] border-white/[0.06]' },
    { label: 'External Links', value: allLinks.external.length, color: 'text-gray-300', bg: 'bg-white/[0.03] border-white/[0.06]' },
    { label: 'Images Found', value: allImages.length, color: 'text-gray-300', bg: 'bg-white/[0.03] border-white/[0.06]' },
    { label: 'Scripts Found', value: allScripts.length, color: 'text-gray-300', bg: 'bg-white/[0.03] border-white/[0.06]' },
    { label: 'Security Score', value: `${avgSecScore}%`, color: avgSecScore >= 75 ? 'text-emerald-400' : avgSecScore >= 50 ? 'text-amber-400' : 'text-red-400', bg: avgSecScore >= 75 ? 'bg-emerald-500/5 border-emerald-500/10' : avgSecScore >= 50 ? 'bg-amber-500/5 border-amber-500/10' : 'bg-red-500/5 border-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Page info */}
      {firstResult && (
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-white">{firstResult.title || 'Untitled'}</h3>
          {(firstResult.metaDescription || firstResult.meta_description) && (
            <p className="text-gray-400 text-sm leading-relaxed">{firstResult.metaDescription || firstResult.meta_description}</p>
          )}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 text-xs sm:text-sm font-mono hover:underline truncate max-w-[200px] sm:max-w-lg">
              {job.url}
            </a>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {stats.map(stat => (
          <div key={stat.label} className={`stat-card border ${stat.bg}`}>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`text-lg sm:text-2xl font-bold font-mono ${stat.color} animate-count-up`}>
                {stat.value}
              </div>
              {stat.badge && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  stat.badge === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                  stat.badge === 'B' ? 'bg-green-500/20 text-green-400' :
                  stat.badge === 'C' ? 'bg-amber-500/20 text-amber-400' :
                  stat.badge === 'D' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {stat.badge}
                </span>
              )}
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 mt-1 sm:mt-1.5 uppercase tracking-[0.15em]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Leaked data alert */}
      {totalLeaks > 0 && (
        <div className="leak-warning">
          <div className="text-red-400 text-lg mt-0.5">⚠️</div>
          <div>
            <div className="text-red-300 font-semibold">Potential Data Leaks Detected</div>
            <div className="text-red-400/70 text-xs mt-1">
              Found {totalLeaks} potential leak{totalLeaks !== 1 ? 's' : ''} including exposed API keys, tokens, or credentials. Check the "Leaked Data" tab for details.
            </div>
          </div>
        </div>
      )}

      {/* Reading stats */}
      <div className="flex gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500 flex-wrap">
        <span>📖 Reading time: <span className="text-gray-300 font-mono">{readingTime} min</span></span>
        <span>📊 {results.length} page{results.length !== 1 ? 's' : ''} analyzed</span>
      </div>

      {/* Suggestions summary */}
      {suggestions.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-amber-400 text-lg">💡</div>
            <div>
              <div className="text-amber-300 font-semibold text-sm">{suggestions.length} Improvement Suggestion{suggestions.length !== 1 ? 's' : ''}</div>
              <div className="text-amber-400/70 text-xs mt-1">
                Found {suggestions.filter(s => s.priority === 'high').length} high priority,{' '}
                {suggestions.filter(s => s.priority === 'medium').length} medium, and{' '}
                {suggestions.filter(s => s.priority === 'low').length} low priority suggestions.
                Check the “Suggestions” tab for details.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Suggestions Tab ─────────────────────────────────────────── */
function SuggestionsTab({ suggestions }) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const categories = ['all', ...new Set(suggestions.map(s => s.category))];
  const priorities = ['all', 'high', 'medium', 'low'];

  const filtered = suggestions.filter(s => {
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    if (filterPriority !== 'all' && s.priority !== filterPriority) return false;
    return true;
  });

  const priorityConfig = {
    high: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', badge: 'bg-red-500/20 text-red-400', icon: '🔴' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500/20 text-amber-400', icon: '🟡' },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', badge: 'bg-blue-500/20 text-blue-400', icon: '🔵' },
  };

  const categoryConfig = {
    seo: { label: 'SEO', icon: '🔍', color: 'text-emerald-400' },
    accessibility: { label: 'Accessibility', icon: '♿', color: 'text-purple-400' },
    performance: { label: 'Performance', icon: '⚡', color: 'text-yellow-400' },
    security: { label: 'Security', icon: '🛡️', color: 'text-red-400' },
    content: { label: 'Content', icon: '📝', color: 'text-sky-400' },
    technical: { label: 'Technical', icon: '⚙️', color: 'text-gray-400' },
  };

  // Category summary counts
  const categoryCounts = {};
  suggestions.forEach(s => {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  });

  const highCount = suggestions.filter(s => s.priority === 'high').length;
  const mediumCount = suggestions.filter(s => s.priority === 'medium').length;
  const lowCount = suggestions.filter(s => s.priority === 'low').length;

  // Health score (simple: deduct points per issue)
  const healthScore = Math.max(0, Math.min(100,
    100 - (highCount * 12) - (mediumCount * 5) - (lowCount * 2)
  ));
  const healthColor = healthScore >= 80 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-400' : 'text-red-400';
  const healthBg = healthScore >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : healthScore >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  return (
    <div className="space-y-6">
      {/* Health Score Card */}
      <div className={`rounded-xl border p-3 sm:p-5 ${healthBg} flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6`}>
        <div className="flex-shrink-0 text-center">
          <div className={`text-3xl sm:text-4xl font-bold font-mono ${healthColor}`}>{healthScore}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Health Score</div>
        </div>
        <div className="flex-1">
          <div className="w-full bg-dark-700 rounded-full h-2.5 mb-3">
            <div
              className={`h-2.5 rounded-full transition-all duration-1000 ${healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-red-400">{highCount} Critical</span>
            <span className="text-amber-400">{mediumCount} Warnings</span>
            <span className="text-blue-400">{lowCount} Info</span>
          </div>
        </div>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Object.entries(categoryConfig).map(([key, cfg]) => {
          const count = categoryCounts[key] || 0;
          return (
            <button
              key={key}
              onClick={() => setFilterCategory(filterCategory === key ? 'all' : key)}
              className={`rounded-lg border px-3 py-2.5 text-center transition-all ${
                filterCategory === key
                  ? 'bg-white/10 border-white/20'
                  : count > 0
                    ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                    : 'bg-white/[0.01] border-white/[0.03] opacity-50'
              }`}
            >
              <div className="text-lg">{cfg.icon}</div>
              <div className={`text-xs font-medium mt-1 ${count > 0 ? cfg.color : 'text-gray-600'}`}>{cfg.label}</div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">{count} issue{count !== 1 ? 's' : ''}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <span className="text-xs text-gray-500">Priority:</span>
        {priorities.map(p => (
          <button
            key={p}
            onClick={() => setFilterPriority(p)}
            className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
              filterPriority === p
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            {p === 'all' ? 'All' : p === 'high' ? '🔴 High' : p === 'medium' ? '🟡 Medium' : '🔵 Low'}
          </button>
        ))}
        <span className="text-xs text-gray-600 ml-auto">{filtered.length} of {suggestions.length} showing</span>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-sm font-medium text-gray-400">
              {suggestions.length === 0 ? 'No issues found — looking good!' : 'No suggestions match the current filters.'}
            </p>
          </div>
        ) : filtered.map((s, i) => {
          const pCfg = priorityConfig[s.priority] || priorityConfig.low;
          const cCfg = categoryConfig[s.category] || { label: s.category, icon: '📋', color: 'text-gray-400' };
          return (
            <div key={i} className={`rounded-xl border p-4 ${pCfg.bg} transition-all hover:border-white/10`}>
              <div className="flex items-start gap-3">
                <span className="text-sm mt-0.5 flex-shrink-0">{pCfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-sm font-semibold text-white">{s.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${pCfg.badge}`}>
                      {s.priority}
                    </span>
                    <span className={`text-[10px] ${cCfg.color} flex items-center gap-1`}>
                      {cCfg.icon} {cCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.description}</p>
                  {s.impact && (
                    <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5">
                      <span className="text-gray-600">Impact:</span>
                      <span className={pCfg.color}>{s.impact}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Links Tab ──────────────────────────────────────────────── */
function LinksTab({ links }) {
  const [view, setView] = useState('internal');
  const data = view === 'internal' ? links.internal : links.external;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setView('internal')}
          className={view === 'internal' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
        >
          Internal ({links.internal.length})
        </button>
        <button
          onClick={() => setView('external')}
          className={view === 'external' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
        >
          External ({links.external.length})
        </button>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="data-table">
          <thead className="sticky top-0 bg-dark-800">
            <tr>
              <th>URL</th>
              <th>Anchor Text</th>
              {view === 'external' && <th>Domain</th>}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 200).map((link, i) => (
              <tr key={i}>
                <td>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:underline truncate block max-w-md">
                    {link.url}
                  </a>
                </td>
                <td className="text-gray-400 max-w-xs truncate">{link.text || '—'}</td>
                {view === 'external' && <td className="text-gray-500">{link.domain}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">No {view} links found</div>
        )}
      </div>
    </div>
  );
}

/* ─── Images Tab ─────────────────────────────────────────────── */
function ImagesTab({ images }) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">{images.length} images found</p>
      {images.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No images found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {images.slice(0, 60).map((img, i) => (
            <div key={i} className="bg-dark-750 rounded-lg border border-dark-600/30 overflow-hidden group">
              <div className="aspect-video bg-dark-700 flex items-center justify-center overflow-hidden">
                <img
                  src={img.src}
                  alt={img.alt || ''}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-gray-600 text-xs p-4 text-center">Failed to load</div>';
                  }}
                />
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-400 truncate font-mono">{img.alt || 'No alt text'}</p>
                <a href={img.src} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-600 hover:text-gray-300 truncate block mt-1">
                  {img.src}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Text Content Tab ───────────────────────────────────────── */
function TextTab({ results }) {
  const [expandedPage, setExpandedPage] = useState(0);
  const result = results[expandedPage];

  return (
    <div className="space-y-4">
      {results.length > 1 && (
        <select
          value={expandedPage}
          onChange={(e) => setExpandedPage(parseInt(e.target.value))}
          className="input-field text-xs max-w-md"
        >
          {results.map((r, i) => (
            <option key={i} value={i} className="bg-dark-800">{r.pageUrl}</option>
          ))}
        </select>
      )}

      {result && (
        <div className="space-y-6">
          {/* Headings */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Headings</h4>
            <div className="space-y-2">
              {Object.entries(result.headings || {}).map(([level, headings]) =>
                headings.map((h, i) => (
                  <div key={`${level}-${i}`} className="flex items-start gap-3">
                    <span className="text-[10px] font-mono text-white bg-white/[0.1] px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                      {level}
                    </span>
                    <span className="text-gray-300 text-sm">{h}</span>
                  </div>
                ))
              )}
              {Object.values(result.headings || {}).flat().length === 0 && (
                <div className="text-gray-500 text-sm">No headings found</div>
              )}
            </div>
          </div>

          {/* Paragraphs */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              Paragraphs ({(result.paragraphs || []).length})
            </h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(result.paragraphs || []).slice(0, 50).map((p, i) => (
                <p key={i} className="text-gray-400 text-sm leading-relaxed border-l-2 border-dark-600 pl-3">
                  {p}
                </p>
              ))}
              {(result.paragraphs || []).length === 0 && (
                <div className="text-gray-500 text-sm">No paragraphs found</div>
              )}
            </div>
          </div>

          {/* Word count */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-xs sm:text-sm">
            <div>
              <span className="text-gray-500">Word Count: </span>
              <span className="text-white font-mono">{result.wordCount?.toLocaleString() || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Characters: </span>
              <span className="text-white font-mono">
                {(result.paragraphs || []).join(' ').length.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Reading Time: </span>
              <span className="text-white font-mono">{Math.max(1, Math.round((result.wordCount || 0) / 200))} min</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tables Tab ──────────────────────────────────────────────── */
function TablesTab({ results }) {
  const allTables = results.flatMap((r, pi) =>
    (r.tablesData || []).map((t, ti) => ({ ...t, pageIndex: pi, tableIndex: ti, pageUrl: r.pageUrl }))
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">{allTables.length} tables found</p>
      {allTables.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No tables found on scraped pages</div>
      ) : (
        allTables.slice(0, 10).map((table, idx) => (
          <div key={idx} className="overflow-x-auto bg-dark-750 rounded-lg border border-dark-600/30">
            <div className="px-4 py-2 border-b border-dark-600/30 text-xs text-gray-500 font-mono">
              Table {idx + 1} from {table.pageUrl}
            </div>
            <table className="data-table">
              {table.headers.length > 0 && (
                <thead>
                  <tr>
                    {table.headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {table.rows.slice(0, 30).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

/* ─── Contacts Tab ────────────────────────────────────────────── */
function ContactsTab({ emails, phones, social, contactInfo }) {
  const hasContactInfo = contactInfo && (
    contactInfo.names?.length > 0 || contactInfo.addresses?.length > 0 ||
    contactInfo.locations?.length > 0 || contactInfo.roles?.length > 0 ||
    contactInfo.websites?.length > 0
  );

  return (
    <div className="space-y-6">
      {/* Person/Company Info Card */}
      {hasContactInfo && (
        <div className="bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>👤</span> Contact Details Found
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {contactInfo.names?.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Name</span>
                <div className="text-white font-medium mt-1">
                  {contactInfo.names.map((n, i) => (
                    <div key={i}>{n}</div>
                  ))}
                </div>
              </div>
            )}
            {contactInfo.roles?.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Role / Title</span>
                <div className="text-gray-300 mt-1">
                  {contactInfo.roles.map((r, i) => (
                    <div key={i}>{r}</div>
                  ))}
                </div>
              </div>
            )}
            {contactInfo.addresses?.length > 0 && (
              <div className="md:col-span-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Address</span>
                {contactInfo.addresses.map((a, i) => (
                  <div key={i} className="text-gray-300 mt-1 text-sm">{a}</div>
                ))}
              </div>
            )}
            {contactInfo.locations?.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Location</span>
                {contactInfo.locations.map((l, i) => (
                  <div key={i} className="text-gray-300 mt-1 text-sm">{l}</div>
                ))}
              </div>
            )}
            {contactInfo.websites?.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Website</span>
                {contactInfo.websites.map((w, i) => (
                  <a key={i} href={w} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:underline mt-1 text-sm block truncate">{w}</a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emails */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>📧</span> Email Addresses ({emails.length})
        </h4>
        {emails.length === 0 ? (
          <div className="text-gray-500 text-sm">No email addresses found</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {emails.map((email, i) => (
              <a
                key={i}
                href={`mailto:${email}`}
                className="px-3 py-1.5 bg-dark-750 border border-dark-600/30 rounded-lg text-sm font-mono text-gray-300 hover:border-white/20 transition-colors"
              >
                {email}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Phones */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>📞</span> Phone Numbers ({phones.length})
        </h4>
        {phones.length === 0 ? (
          <div className="text-gray-500 text-sm">No phone numbers found</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {phones.map((phone, i) => (
              <a
                key={i}
                href={`tel:${phone}`}
                className="px-3 py-1.5 bg-dark-750 border border-dark-600/30 rounded-lg text-sm font-mono text-gray-300 hover:border-white/20 transition-colors"
              >
                {phone}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Social Links */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>🌐</span> Social Media ({social.length})
        </h4>
        {social.length === 0 ? (
          <div className="text-gray-500 text-sm">No social media links found</div>
        ) : (
          <div className="space-y-2">
            {social.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-dark-750 border border-dark-600/30 rounded-lg">
                <span className="text-xs font-medium text-white bg-white/[0.1] px-2 py-0.5 rounded">
                  {s.platform}
                </span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-gray-300 hover:underline truncate">
                  {s.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* No contact data at all */}
      {emails.length === 0 && phones.length === 0 && social.length === 0 && !hasContactInfo && (
        <div className="text-center py-10 text-gray-500">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">No contact information found on the scanned pages.</p>
          <p className="text-xs text-gray-600 mt-2">Try enabling "Follow Links" or "Deep Scan" to crawl sub-pages like /about or /contact</p>
        </div>
      )}
    </div>
  );
}

/* ─── Metadata Tab ────────────────────────────────────────────── */
function MetadataTab({ results }) {
  const meta = results[0]?.metadata || {};

  const MetaRow = ({ label, value }) => {
    if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-dark-700/30">
        <span className="text-xs font-mono text-gray-500 uppercase tracking-wider sm:w-40 flex-shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-300 font-mono break-all">
          {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Meta */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Basic Metadata</h4>
        <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
          <MetaRow label="Title" value={meta.title} />
          <MetaRow label="Description" value={meta.description} />
          <MetaRow label="Keywords" value={meta.keywords} />
          <MetaRow label="Robots" value={meta.robots} />
          <MetaRow label="Viewport" value={meta.viewport} />
          <MetaRow label="Canonical" value={meta.canonical} />
          <MetaRow label="Favicon" value={meta.favicon} />
          <MetaRow label="Language" value={meta.language} />
        </div>
      </div>

      {/* Open Graph */}
      {meta.openGraph && Object.keys(meta.openGraph).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Open Graph</h4>
          <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
            {Object.entries(meta.openGraph).map(([key, val]) => (
              <MetaRow key={key} label={`og:${key}`} value={val} />
            ))}
          </div>
        </div>
      )}

      {/* Twitter Card */}
      {meta.twitterCard && Object.keys(meta.twitterCard).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Twitter Card</h4>
          <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
            {Object.entries(meta.twitterCard).map(([key, val]) => (
              <MetaRow key={key} label={`twitter:${key}`} value={val} />
            ))}
          </div>
        </div>
      )}

      {/* JSON-LD */}
      {meta.jsonLd && meta.jsonLd.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">JSON-LD Structured Data</h4>
          {meta.jsonLd.map((ld, i) => (
            <pre key={i} className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 text-xs font-mono text-gray-400 overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(ld, null, 2)}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Tech Stack Tab ──────────────────────────────────────────── */
function TechTab({ results }) {
  // Aggregate tech detections across all pages
  const aggTech = { cms: new Set(), frameworks: new Set(), analytics: new Set(), cdn: new Set(), servers: new Set(), poweredBy: new Set() };

  results.forEach(r => {
    const ts = r.techStack || {};
    (ts.cms || []).forEach(v => aggTech.cms.add(v));
    (ts.frameworks || []).forEach(v => aggTech.frameworks.add(v));
    (ts.analytics || []).forEach(v => aggTech.analytics.add(v));
    (ts.cdn || []).forEach(v => aggTech.cdn.add(v));
    if (ts.server) aggTech.servers.add(ts.server);
    if (ts.poweredBy) aggTech.poweredBy.add(ts.poweredBy);
  });

  const TechSection = ({ title, icon, items, color }) => (
    <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
      <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h4>
      {items.length === 0 ? (
        <div className="text-gray-500 text-sm">None detected</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${color}`}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
      <TechSection title="CMS" icon="📦" items={[...aggTech.cms]} color="bg-purple-500/10 text-purple-400 border-purple-500/20" />
      <TechSection title="Frameworks" icon="⚙️" items={[...aggTech.frameworks]} color="bg-blue-500/10 text-blue-400 border-blue-500/20" />
      <TechSection title="Analytics" icon="📊" items={[...aggTech.analytics]} color="bg-yellow-500/10 text-yellow-400 border-yellow-500/20" />
      <TechSection title="CDN" icon="🌐" items={[...aggTech.cdn]} color="bg-cyan-500/10 text-cyan-400 border-cyan-500/20" />
      <TechSection title="Server" icon="🖥️" items={[...aggTech.servers]} color="bg-green-500/10 text-green-400 border-green-500/20" />
      <TechSection title="Powered By" icon="⚡" items={[...aggTech.poweredBy]} color="bg-orange-500/10 text-orange-400 border-orange-500/20" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEW TABS — Scripts, Security, Leaks, Extras
   ═══════════════════════════════════════════════════════════════ */

/* ─── Scripts & CSS Tab ──────────────────────────────────────── */
function ScriptsTab({ scripts, stylesheets }) {
  const [view, setView] = useState('scripts');
  const externalScripts = scripts.filter(s => s.src);
  const inlineScripts = scripts.filter(s => !s.src);
  const externalStyles = stylesheets.filter(s => s.type === 'external');
  const inlineStyles = stylesheets.filter(s => s.type === 'inline');

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={() => setView('scripts')} className={view === 'scripts' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>
          Scripts ({scripts.length})
        </button>
        <button onClick={() => setView('styles')} className={view === 'styles' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>
          Stylesheets ({stylesheets.length})
        </button>
      </div>

      {view === 'scripts' ? (
        <div className="space-y-4">
          {/* External scripts */}
          <div>
            <div className="section-header">
              <div className="section-header-icon bg-orange-500/10 text-orange-400">📜</div>
              <span className="section-header-text">External Scripts</span>
              <span className="section-header-count">{externalScripts.length}</span>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {externalScripts.length === 0 ? (
                <div className="text-gray-500 text-sm">No external scripts found</div>
              ) : externalScripts.map((s, i) => (
                <div key={i} className="bg-dark-750 rounded-lg px-4 py-2.5 border border-dark-600/30 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {s.async && <span className="chip chip-cyan text-[10px]">async</span>}
                    {s.defer && <span className="chip chip-purple text-[10px]">defer</span>}
                  </div>
                  <a href={s.src} target="_blank" rel="noopener noreferrer" className="text-gray-300 text-xs font-mono hover:underline truncate flex-1">
                    {s.src}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Inline scripts */}
          {inlineScripts.length > 0 && (
            <div>
              <div className="section-header">
                <div className="section-header-icon bg-amber-500/10 text-amber-400">{'</>'}</div>
                <span className="section-header-text">Inline Scripts</span>
                <span className="section-header-count">{inlineScripts.length}</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {inlineScripts.slice(0, 20).map((s, i) => (
                  <pre key={i} className="bg-dark-750 rounded-lg p-3 border border-dark-600/30 text-xs font-mono text-gray-400 overflow-x-auto max-h-24 overflow-y-auto">
                    {s.inline?.substring(0, 300) || '(empty)'}
                  </pre>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* External stylesheets */}
          <div>
            <div className="section-header">
              <div className="section-header-icon bg-blue-500/10 text-blue-400">🎨</div>
              <span className="section-header-text">External Stylesheets</span>
              <span className="section-header-count">{externalStyles.length}</span>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {externalStyles.length === 0 ? (
                <div className="text-gray-500 text-sm">No external stylesheets found</div>
              ) : externalStyles.map((s, i) => (
                <div key={i} className="bg-dark-750 rounded-lg px-4 py-2.5 border border-dark-600/30">
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-gray-300 text-xs font-mono hover:underline truncate block">
                    {s.href}
                  </a>
                  {s.media && <span className="text-[10px] text-gray-500 mt-1 block">Media: {s.media}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Inline styles */}
          {inlineStyles.length > 0 && (
            <div>
              <div className="section-header">
                <div className="section-header-icon bg-purple-500/10 text-purple-400">✨</div>
                <span className="section-header-text">Inline Styles</span>
                <span className="section-header-count">{inlineStyles.length}</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {inlineStyles.map((s, i) => (
                  <div key={i} className="bg-dark-750 rounded-lg p-3 border border-dark-600/30">
                    <div className="text-[10px] text-gray-500 mb-1">{s.size} chars</div>
                    <pre className="text-xs font-mono text-gray-400 overflow-x-auto">{s.snippet}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Security Tab ───────────────────────────────────────────── */
function SecurityTab({ security }) {
  const sec = security[0] || {};
  const headers = sec.headers || {};
  const missing = sec.missingHeaders || [];
  const score = sec.score || 0;

  const scoreColor = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = score >= 75 ? 'from-emerald-400/20' : score >= 50 ? 'from-amber-400/20' : 'from-red-400/20';

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div className="flex items-center gap-3 sm:gap-6 bg-dark-750 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-dark-600/30">
        <div className="relative">
          <svg className="w-16 h-16 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-dark-600" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6"
              className={scoreColor}
              strokeDasharray={`${score * 2.51} 251`}
              strokeLinecap="round"
              stroke="currentColor"
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center ${scoreColor} font-bold text-xl sm:text-2xl font-mono`}>
            {score}
          </div>
        </div>
        <div>
          <h3 className={`text-lg font-bold ${scoreColor}`}>
            {score >= 75 ? 'Good Security' : score >= 50 ? 'Moderate Security' : 'Weak Security'}
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {Object.keys(headers).length} of 8 security headers present
          </p>
        </div>
      </div>

      {/* Present headers */}
      <div>
        <div className="section-header">
          <div className="section-header-icon bg-emerald-500/10 text-emerald-400">✓</div>
          <span className="section-header-text">Present Headers</span>
          <span className="section-header-count">{Object.keys(headers).length}</span>
        </div>
        <div className="space-y-2">
          {Object.keys(headers).length === 0 ? (
            <div className="text-gray-500 text-sm">No security headers detected</div>
          ) : Object.entries(headers).map(([key, val]) => (
            <div key={key} className="bg-dark-750 rounded-lg px-4 py-3 border border-emerald-500/10">
              <div className="text-xs font-mono text-emerald-400 font-semibold mb-1">{key}</div>
              <div className="text-xs font-mono text-gray-400 break-all">{typeof val === 'string' ? val : JSON.stringify(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing headers */}
      {missing.length > 0 && (
        <div>
          <div className="section-header">
            <div className="section-header-icon bg-red-500/10 text-red-400">✗</div>
            <span className="section-header-text">Missing Headers</span>
            <span className="section-header-count">{missing.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {missing.map(h => (
              <span key={h} className="chip chip-red">{h}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Leaked Data Tab ────────────────────────────────────────── */
function LeaksTab({ leaked }) {
  const agg = {
    apiKeys: leaked.flatMap(l => l.apiKeys || []),
    awsKeys: leaked.flatMap(l => l.awsKeys || []),
    jwtTokens: leaked.flatMap(l => l.jwtTokens || []),
    passwords: leaked.flatMap(l => l.passwords || []),
    privateIPs: [...new Set(leaked.flatMap(l => l.privateIPs || []))],
    databaseUrls: leaked.flatMap(l => l.databaseUrls || []),
    s3Buckets: leaked.flatMap(l => l.s3Buckets || []),
    envVars: [...new Set(leaked.flatMap(l => l.envVars || []))],
    sensitiveComments: leaked.flatMap(l => l.sensitiveComments || []),
    exposedPaths: [...new Set(leaked.flatMap(l => l.exposedPaths || []))],
  };

  const totalFindings = Object.values(agg).reduce((sum, arr) => sum + arr.length, 0);
  const severity = totalFindings === 0 ? 'clean' : totalFindings < 3 ? 'low' : totalFindings < 8 ? 'medium' : 'high';

  const LeakSection = ({ title, icon, items, color = 'red' }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="section-header">
          <div className={`section-header-icon bg-${color}-500/10 text-${color}-400`}>{icon}</div>
          <span className="section-header-text">{title}</span>
          <span className="section-header-count text-red-400">{items.length} found</span>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="leak-highlight">
              {typeof item === 'object'
                ? <span><span className="text-red-400 font-semibold">{item.type}: </span>{item.value || item.full || JSON.stringify(item)}</span>
                : item
              }
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Severity banner */}
      <div className={`rounded-xl p-5 border ${
        severity === 'clean' ? 'bg-emerald-500/5 border-emerald-500/[0.15]' :
        severity === 'low' ? 'bg-amber-500/5 border-amber-500/[0.15]' :
        severity === 'medium' ? 'bg-orange-500/5 border-orange-500/[0.15]' :
        'bg-red-500/5 border-red-500/[0.15]'
      }`}>
        <div className="flex items-center gap-4">
          <div className="text-3xl">
            {severity === 'clean' ? '✅' : severity === 'low' ? '⚠️' : severity === 'medium' ? '🔶' : '🚨'}
          </div>
          <div>
            <h3 className={`font-bold text-lg ${
              severity === 'clean' ? 'text-emerald-400' :
              severity === 'low' ? 'text-amber-400' :
              severity === 'medium' ? 'text-orange-400' :
              'text-red-400'
            }`}>
              {severity === 'clean' ? 'No Leaks Detected' :
               severity === 'low' ? 'Low Risk — Minor Findings' :
               severity === 'medium' ? 'Medium Risk — Review Recommended' :
               'High Risk — Immediate Action Required'}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {totalFindings} potential leak{totalFindings !== 1 ? 's' : ''} detected across all scraped pages
            </p>
          </div>
        </div>
      </div>

      {/* Leak sections */}
      <LeakSection title="API Keys & Secrets" icon="🔑" items={agg.apiKeys} />
      <LeakSection title="AWS Credentials" icon="☁️" items={agg.awsKeys} />
      <LeakSection title="JWT Tokens" icon="🎫" items={agg.jwtTokens} />
      <LeakSection title="Passwords" icon="🔒" items={agg.passwords} />
      <LeakSection title="Database URLs" icon="🗄️" items={agg.databaseUrls} />
      <LeakSection title="S3 Buckets" icon="📦" items={agg.s3Buckets} />
      <LeakSection title="Private IPs" icon="🌐" items={agg.privateIPs} color="amber" />
      <LeakSection title="Environment Variables" icon="📋" items={agg.envVars} color="amber" />
      <LeakSection title="Sensitive Comments" icon="💬" items={agg.sensitiveComments} />
      <LeakSection title="Exposed Paths" icon="📂" items={agg.exposedPaths} color="amber" />

      {totalFindings === 0 && (
        <div className="text-center py-10 text-gray-500">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm">No leaked or sensitive data patterns were detected on the scanned pages.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Extras Tab (Comments, Hidden Fields, Iframes, Downloads, Videos) ── */
function ExtrasTab({ comments, hidden, iframes, downloads, videos }) {
  const [section, setSection] = useState('downloads');

  const sections = [
    { key: 'downloads', label: 'Downloads', count: downloads.length, icon: '📥' },
    { key: 'iframes', label: 'Iframes', count: iframes.length, icon: '📦' },
    { key: 'comments', label: 'Comments', count: comments.length, icon: '💬' },
    { key: 'hidden', label: 'Hidden Fields', count: hidden.length, icon: '👁️‍🗨️' },
    { key: 'videos', label: 'Videos', count: videos.length, icon: '🎬' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 ${section === s.key ? 'btn-primary' : 'btn-secondary'}`}
          >
            <span>{s.icon}</span> <span className="hidden sm:inline">{s.label}</span> ({s.count})
          </button>
        ))}
      </div>

      {section === 'downloads' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {downloads.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No downloadable files found</div>
          ) : downloads.map((f, i) => (
            <div key={i} className="bg-dark-750 rounded-lg px-4 py-3 border border-dark-600/30 flex items-center gap-3">
              <span className="chip chip-blue text-[10px] uppercase">{f.extension}</span>
              <div className="flex-1 min-w-0">
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 text-xs font-mono hover:underline truncate block">
                  {f.url}
                </a>
                {f.text && <div className="text-[10px] text-gray-500 mt-0.5 truncate">{f.text}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'iframes' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {iframes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No iframes found</div>
          ) : iframes.map((f, i) => (
            <div key={i} className="bg-dark-750 rounded-lg px-4 py-3 border border-dark-600/30">
              <a href={f.src} target="_blank" rel="noopener noreferrer" className="text-gray-300 text-xs font-mono hover:underline truncate block">
                {f.src || 'No src'}
              </a>
              <div className="flex gap-2 mt-1.5">
                {f.title && <span className="text-[10px] text-gray-500">Title: {f.title}</span>}
                {f.sandbox && <span className="chip chip-green text-[10px]">sandboxed</span>}
                {f.width && <span className="text-[10px] text-gray-600">{f.width}x{f.height}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'comments' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No HTML comments found</div>
          ) : comments.map((c, i) => (
            <pre key={i} className="bg-dark-750 rounded-lg p-3 border border-dark-600/30 text-xs font-mono text-gray-400 overflow-x-auto">
              {'<!-- '}{c}{' -->'}
            </pre>
          ))}
        </div>
      )}

      {section === 'hidden' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {hidden.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No hidden form fields found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Value</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {hidden.map((h, i) => (
                    <tr key={i}>
                      <td className="text-white font-mono">{h.name || '—'}</td>
                      <td className="text-gray-400 font-mono max-w-xs truncate">{h.value || '—'}</td>
                      <td className="text-gray-500">{h.id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {section === 'videos' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {videos.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No video elements found</div>
          ) : videos.map((v, i) => (
            <div key={i} className="bg-dark-750 rounded-lg px-4 py-3 border border-dark-600/30">
              <a href={v.src} target="_blank" rel="noopener noreferrer" className="text-gray-300 text-xs font-mono hover:underline truncate block">
                {v.src}
              </a>
              <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500">
                {v.type && <span>Type: {v.type}</span>}
                {v.poster && <span>Has poster</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── SEO & Schema Tab ────────────────────────────────────────── */
function SEOSchemaTab({ results, schemaOrg, microdata, breadcrumbs, linkRelations, languageInfo }) {
  const [section, setSection] = useState('seo');
  const sections = [
    { id: 'seo', label: 'SEO Score' },
    { id: 'schema', label: 'Schema.org' },
    { id: 'microdata', label: 'Microdata' },
    { id: 'breadcrumbs', label: 'Breadcrumbs' },
    { id: 'language', label: 'Language' },
    { id: 'linkrel', label: 'Link Relations' },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${section === s.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-dark-700/50 text-gray-400 hover:text-gray-300 border border-dark-600/30'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'seo' && (
        <div className="space-y-4">
          {results.map((r, i) => {
            const seo = r.seoScore || r.seo_score || {};
            return (
              <div key={i} className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-300 text-sm font-medium truncate max-w-md">{r.pageUrl || r.page_url}</span>
                  <span className={`text-2xl font-bold ${(seo.score || 0) >= 80 ? 'text-green-400' : (seo.score || 0) >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {seo.score || 0}/100
                  </span>
                </div>
                {seo.grade && <span className={`badge ${seo.grade === 'A+' || seo.grade === 'A' ? 'badge-green' : seo.grade === 'B' ? 'badge-blue' : 'badge-red'}`}>{seo.grade}</span>}
                {seo.deductions && seo.deductions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {seo.deductions.slice(0, 10).map((d, j) => (
                      <div key={j} className="text-xs text-gray-400 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${d.severity === 'high' ? 'bg-red-500' : d.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        {d.reason} <span className="text-gray-600">(-{d.points})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {section === 'schema' && (
        <div className="space-y-3">
          {schemaOrg.filter(s => s.schemas?.length > 0).length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No Schema.org data found</div>
          ) : schemaOrg.map((s, i) => (
            s.schemas?.length > 0 && (
              <div key={i} className="space-y-2">
                <div className="text-xs text-gray-500 font-medium">{s.count} schema(s) detected — Types: {s.types?.join(', ')}</div>
                {s.schemas.map((schema, j) => (
                  <div key={j} className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge badge-blue">{Array.isArray(schema.type) ? schema.type.join(', ') : schema.type}</span>
                      {schema.name && <span className="text-gray-300 text-sm">{schema.name}</span>}
                    </div>
                    {schema.description && <p className="text-gray-500 text-xs mb-2">{schema.description}</p>}
                    {schema.url && <a href={schema.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-xs hover:underline block mb-2">{schema.url}</a>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {schema.properties?.map((p, k) => <span key={k} className="badge badge-gray text-[10px]">{p}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      )}

      {section === 'microdata' && (
        <div className="space-y-3">
          {microdata.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No microdata found</div>
          ) : microdata.map((item, i) => (
            <div key={i} className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
              {item.type && <span className="badge badge-purple text-xs mb-2 inline-block">{item.type}</span>}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(item.properties || {}).map(([key, val], j) => (
                  <div key={j} className="text-xs">
                    <span className="text-gray-500">{key}: </span>
                    <span className="text-gray-300 break-all">{String(val).substring(0, 100)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'breadcrumbs' && (
        <div className="space-y-2">
          {breadcrumbs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No breadcrumbs found</div>
          ) : (
            <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
              <div className="flex flex-wrap items-center gap-2">
                {breadcrumbs.map((b, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-gray-600">›</span>}
                    {b.url ? (
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm hover:underline">{b.name}</a>
                    ) : (
                      <span className="text-gray-300 text-sm">{b.name}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'language' && (
        <div className="space-y-3">
          {languageInfo.map((lang, i) => (
            lang.primary && (
              <div key={i} className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Primary: </span><span className="text-white font-medium">{lang.primary}</span></div>
                  <div><span className="text-gray-500">Direction: </span><span className="text-gray-300">{lang.direction}</span></div>
                  {lang.ogLocale && <div><span className="text-gray-500">OG Locale: </span><span className="text-gray-300">{lang.ogLocale}</span></div>}
                  {lang.isMultilingual && <div><span className="text-green-400 text-xs">✓ Multilingual site</span></div>}
                </div>
                {lang.alternateLanguages?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {lang.alternateLanguages.map((alt, j) => (
                      <span key={j} className="badge badge-blue text-xs">{alt.lang}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      )}

      {section === 'linkrel' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {linkRelations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No link relations found</div>
          ) : linkRelations.map((lr, i) => (
            <div key={i} className="bg-dark-750 rounded-lg px-4 py-2.5 border border-dark-600/30 flex items-center gap-3">
              <span className="badge badge-gray text-[10px] min-w-16 text-center">{lr.rel}</span>
              <span className="text-gray-300 text-xs font-mono truncate flex-1">{lr.href || '—'}</span>
              {lr.type && <span className="text-gray-600 text-[10px]">{lr.type}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Design Intel Tab ────────────────────────────────────────── */
function DesignIntelTab({ colorPalette, fontInfo }) {
  const [section, setSection] = useState('colors');
  const sections = [
    { id: 'colors', label: 'Color Palette' },
    { id: 'fonts', label: 'Typography' },
  ];

  // Merge colors from all pages
  const mergedColors = (() => {
    const colorMap = new Map();
    for (const p of colorPalette) {
      for (const c of (p.colors || [])) {
        colorMap.set(c.color, (colorMap.get(c.color) || 0) + (c.count || 1));
      }
    }
    return [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([color, count]) => ({ color, count }));
  })();

  const cssVars = colorPalette.flatMap(p => p.cssVariables || []);
  const themeColor = colorPalette.find(p => p.themeColor)?.themeColor;

  // Merge fonts
  const allGoogleFonts = [...new Set(fontInfo.flatMap(f => f.googleFonts || []))];
  const allCustomFonts = [...new Set(fontInfo.flatMap(f => f.customFonts || []))];
  const allFamilies = [...new Set(fontInfo.flatMap(f => f.families || []))];

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${section === s.id ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-dark-700/50 text-gray-400 hover:text-gray-300 border border-dark-600/30'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'colors' && (
        <div className="space-y-4">
          {themeColor && (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-gray-500 text-sm">Theme color:</span>
              <div className="w-8 h-8 rounded-lg border border-dark-500 shadow-lg" style={{ backgroundColor: themeColor }} />
              <span className="text-white text-sm font-mono">{themeColor}</span>
            </div>
          )}
          <div className="text-gray-500 text-xs mb-2">{mergedColors.length} unique colors detected</div>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {mergedColors.map((c, i) => (
              <div key={i} className="group relative">
                <div className="w-full aspect-square rounded-lg border border-dark-500 shadow-md cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c.color }} />
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-800 border border-dark-600 rounded px-1.5 py-0.5 text-[9px] text-white font-mono whitespace-nowrap z-10">
                  {c.color} ({c.count}×)
                </div>
              </div>
            ))}
          </div>
          {cssVars.length > 0 && (
            <div className="mt-6">
              <h4 className="text-gray-400 text-xs font-medium mb-2">CSS Custom Properties</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cssVars.map((v, i) => (
                  <div key={i} className="bg-dark-750 rounded-lg px-3 py-2 border border-dark-600/30 flex items-center gap-3">
                    <div className="w-5 h-5 rounded border border-dark-500 flex-shrink-0" style={{ backgroundColor: v.value }} />
                    <span className="text-gray-500 text-xs font-mono flex-1 truncate">{v.name}</span>
                    <span className="text-gray-300 text-xs font-mono">{v.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'fonts' && (
        <div className="space-y-4">
          {allGoogleFonts.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-xs font-medium mb-2">Google Fonts</h4>
              <div className="flex flex-wrap gap-2">
                {allGoogleFonts.map((f, i) => <span key={i} className="badge badge-blue">{f}</span>)}
              </div>
            </div>
          )}
          {allCustomFonts.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-xs font-medium mb-2">Custom @font-face</h4>
              <div className="flex flex-wrap gap-2">
                {allCustomFonts.map((f, i) => <span key={i} className="badge badge-purple">{f}</span>)}
              </div>
            </div>
          )}
          {allFamilies.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-xs font-medium mb-2">Font Families Used ({allFamilies.length})</h4>
              <div className="space-y-1">
                {allFamilies.map((f, i) => (
                  <div key={i} className="bg-dark-750 rounded-lg px-3 py-2 border border-dark-600/30 text-gray-300 text-sm font-mono">{f}</div>
                ))}
              </div>
            </div>
          )}
          {allGoogleFonts.length === 0 && allCustomFonts.length === 0 && allFamilies.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">No font information detected</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Content Tab ─────────────────────────────────────────────── */
function ContentTab({ pricing, reviews, faqs, rssFeeds, copyright }) {
  const [section, setSection] = useState('faqs');
  const sections = [
    { id: 'faqs', label: `FAQs (${faqs.length})` },
    { id: 'pricing', label: `Pricing (${pricing.length})` },
    { id: 'reviews', label: `Reviews (${reviews.length})` },
    { id: 'rss', label: `RSS Feeds (${rssFeeds.length})` },
    { id: 'copyright', label: 'Legal' },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${section === s.id ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-dark-700/50 text-gray-400 hover:text-gray-300 border border-dark-600/30'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'faqs' && (
        <div className="space-y-2">
          {faqs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No FAQ content detected</div>
          ) : faqs.map((f, i) => (
            <details key={i} className="bg-dark-750 rounded-lg border border-dark-600/30 group">
              <summary className="px-4 py-3 cursor-pointer text-gray-300 text-sm font-medium hover:text-white select-none flex items-center justify-between">
                {f.question}
                <span className="badge badge-gray text-[10px] ml-2">{f.source}</span>
              </summary>
              <div className="px-4 pb-3 text-gray-400 text-sm border-t border-dark-600/20 pt-2">{f.answer || 'No answer text'}</div>
            </details>
          ))}
        </div>
      )}

      {section === 'pricing' && (
        <div className="space-y-2">
          {pricing.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No pricing data detected</div>
          ) : pricing.map((p, i) => (
            <div key={i} className="bg-dark-750 rounded-lg px-4 py-3 border border-dark-600/30 flex items-center justify-between">
              <div>
                <span className="text-white text-lg font-bold">{p.value}</span>
                {p.context && <span className="text-gray-500 text-xs ml-3">{p.context}</span>}
              </div>
              {p.structured && <span className="badge badge-green text-[10px]">Structured</span>}
              {p.currency && <span className="badge badge-blue text-[10px]">{p.currency}</span>}
            </div>
          ))}
        </div>
      )}

      {section === 'reviews' && (
        <div className="space-y-2">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No reviews or ratings found</div>
          ) : reviews.map((r, i) => (
            <div key={i} className="bg-dark-750 rounded-lg px-4 py-3 border border-dark-600/30">
              <div className="flex items-center gap-3">
                <span className="badge badge-gray text-[10px]">{r.type}</span>
                {r.ratingValue && <span className="text-amber-400 text-sm font-bold">★ {r.ratingValue}{r.bestRating ? `/${r.bestRating}` : ''}</span>}
                {r.rating && <span className="text-amber-400 text-sm font-bold">★ {r.rating}</span>}
                {r.reviewCount && <span className="text-gray-500 text-xs">({r.reviewCount} reviews)</span>}
                {r.author && <span className="text-gray-400 text-xs">by {r.author}</span>}
              </div>
              {r.body && <p className="text-gray-400 text-xs mt-2">{r.body}</p>}
              {r.itemName && <span className="text-gray-500 text-xs">for: {r.itemName}</span>}
            </div>
          ))}
        </div>
      )}

      {section === 'rss' && (
        <div className="space-y-2">
          {rssFeeds.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No RSS/Atom feeds discovered</div>
          ) : rssFeeds.map((f, i) => (
            <div key={i} className="bg-dark-750 rounded-lg px-4 py-3 border border-dark-600/30 flex items-center gap-3">
              <span className="text-orange-400">📡</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm hover:underline truncate flex-1">{f.url}</a>
              {f.title && <span className="text-gray-500 text-xs">{f.title}</span>}
              <span className="badge badge-gray text-[10px]">{f.type}</span>
            </div>
          ))}
        </div>
      )}

      {section === 'copyright' && (
        <div className="space-y-3">
          {copyright.map((c, i) => (
            c.notices?.length > 0 || c.legalLinks?.length > 0 ? (
              <div key={i} className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 space-y-3">
                {c.notices?.length > 0 && (
                  <div>
                    <h4 className="text-gray-500 text-xs font-medium mb-1">Copyright Notices</h4>
                    {c.notices.map((n, j) => <p key={j} className="text-gray-300 text-sm">{n}</p>)}
                  </div>
                )}
                {c.owner && <div><span className="text-gray-500 text-xs">Owner: </span><span className="text-white text-sm">{c.owner}</span></div>}
                {c.year && <div><span className="text-gray-500 text-xs">Year: </span><span className="text-gray-300 text-sm">{c.year}</span></div>}
                {c.license && <div><span className="text-gray-500 text-xs">License: </span><span className="text-cyan-400 text-sm">{c.license}</span></div>}
                {c.legalLinks?.length > 0 && (
                  <div>
                    <h4 className="text-gray-500 text-xs font-medium mb-1">Legal Pages</h4>
                    <div className="flex flex-wrap gap-2">
                      {c.legalLinks.map((l, j) => (
                        <a key={j} href={l.url} target="_blank" rel="noopener noreferrer" className="badge badge-blue hover:bg-blue-500/30 cursor-pointer">{l.text}</a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null
          ))}
          {copyright.every(c => !c.notices?.length && !c.legalLinks?.length) && (
            <div className="text-center py-8 text-gray-500 text-sm">No copyright or legal information found</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Site Intel Tab ──────────────────────────────────────────── */
function SiteIntelTab({ siteIntel, apiEndpoints, openAPIs, responseHeaders, fingerprints }) {
  const [section, setSection] = useState('overview');
  const hasDns = siteIntel?.dns && Object.keys(siteIntel.dns).length > 0;
  const hasSsl = siteIntel?.ssl && Object.keys(siteIntel.ssl).length > 0;
  const hasSitemap = siteIntel?.sitemap && (siteIntel.sitemap.totalUrls > 0 || siteIntel.sitemap.urls?.length > 0);
  const hasRobots = siteIntel?.robots && Object.keys(siteIntel.robots).length > 0;
  const hasSecurity = siteIntel?.security && Object.keys(siteIntel.security).length > 0;

  const sections = [
    { id: 'overview', label: 'Overview' },
    ...(hasDns ? [{ id: 'dns', label: 'DNS' }] : []),
    ...(hasSsl ? [{ id: 'ssl', label: 'SSL/TLS' }] : []),
    ...(hasSitemap ? [{ id: 'sitemap', label: 'Sitemap' }] : []),
    ...(hasRobots ? [{ id: 'robots', label: 'Robots.txt' }] : []),
    ...(hasSecurity ? [{ id: 'security', label: 'Security' }] : []),
    { id: 'apis', label: `APIs (${apiEndpoints.length})` },
    { id: 'headers', label: 'Headers' },
    { id: 'fingerprint', label: 'Fingerprint' },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${section === s.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-dark-700/50 text-gray-400 hover:text-gray-300 border border-dark-600/30'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {hasDns && (
            <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 text-center">
              <div className="text-2xl font-bold text-emerald-400">{siteIntel.dns.records?.length || 0}</div>
              <div className="text-gray-500 text-xs mt-1">DNS Records</div>
            </div>
          )}
          {hasSsl && (
            <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 text-center">
              <div className={`text-2xl font-bold ${siteIntel.ssl.isValid ? 'text-green-400' : 'text-red-400'}`}>{siteIntel.ssl.isValid ? '✓' : '✗'}</div>
              <div className="text-gray-500 text-xs mt-1">SSL Valid</div>
            </div>
          )}
          {hasSitemap && (
            <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 text-center">
              <div className="text-2xl font-bold text-blue-400">{siteIntel.sitemap.totalUrls || 0}</div>
              <div className="text-gray-500 text-xs mt-1">Sitemap URLs</div>
            </div>
          )}
          <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 text-center">
            <div className="text-2xl font-bold text-purple-400">{apiEndpoints.length}</div>
            <div className="text-gray-500 text-xs mt-1">API Endpoints</div>
          </div>
          <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 text-center">
            <div className="text-2xl font-bold text-cyan-400">{openAPIs.length}</div>
            <div className="text-gray-500 text-xs mt-1">OpenAPI/Swagger</div>
          </div>
          {hasSecurity && siteIntel.security.securityScore && (
            <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 text-center">
              <div className={`text-2xl font-bold ${siteIntel.security.securityScore.grade?.startsWith('A') ? 'text-green-400' : siteIntel.security.securityScore.grade?.startsWith('B') ? 'text-amber-400' : 'text-red-400'}`}>
                {siteIntel.security.securityScore.grade || '—'}
              </div>
              <div className="text-gray-500 text-xs mt-1">Security Grade</div>
            </div>
          )}
        </div>
      )}

      {section === 'dns' && hasDns && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {siteIntel.dns.ipAddresses?.length > 0 && (
            <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
              <h4 className="text-gray-400 text-xs font-medium mb-2">IP Addresses</h4>
              <div className="flex flex-wrap gap-2">
                {siteIntel.dns.ipAddresses.map((ip, i) => <span key={i} className="badge badge-green font-mono">{ip}</span>)}
              </div>
            </div>
          )}
          {siteIntel.dns.records?.map((r, i) => (
            <div key={i} className="bg-dark-750 rounded-lg px-4 py-2.5 border border-dark-600/30 flex items-center gap-3">
              <span className="badge badge-gray text-[10px] min-w-12 text-center">{r.type}</span>
              <span className="text-gray-300 text-xs font-mono truncate flex-1">{typeof r.value === 'object' ? JSON.stringify(r.value) : r.value}</span>
              {r.ttl && <span className="text-gray-600 text-[10px]">TTL: {r.ttl}</span>}
            </div>
          ))}
          {siteIntel.dns.emailProvider && (
            <div className="bg-dark-750 rounded-lg p-3 border border-dark-600/30 text-sm">
              <span className="text-gray-500">Email Provider: </span><span className="text-white">{siteIntel.dns.emailProvider}</span>
            </div>
          )}
          {siteIntel.dns.dnsProvider && (
            <div className="bg-dark-750 rounded-lg p-3 border border-dark-600/30 text-sm">
              <span className="text-gray-500">DNS Provider: </span><span className="text-white">{siteIntel.dns.dnsProvider}</span>
            </div>
          )}
        </div>
      )}

      {section === 'ssl' && !hasSsl && (
        <div className="text-center py-8 text-gray-500 text-sm">No SSL/TLS data available. Run a Deep or ELITE scan with Site Intel enabled.</div>
      )}

      {section === 'ssl' && hasSsl && (
        <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Issuer: </span><span className="text-white">{(typeof siteIntel.ssl.issuer === 'object' ? siteIntel.ssl.issuer?.O || siteIntel.ssl.issuer?.CN || JSON.stringify(siteIntel.ssl.issuer) : siteIntel.ssl.issuer) || '—'}</span></div>
            <div><span className="text-gray-500">Valid: </span><span className={siteIntel.ssl.isValid ? 'text-green-400' : 'text-red-400'}>{siteIntel.ssl.isValid ? 'Yes' : 'No'}</span></div>
            <div><span className="text-gray-500">Subject: </span><span className="text-gray-300">{(typeof siteIntel.ssl.subject === 'object' ? siteIntel.ssl.subject?.CN || JSON.stringify(siteIntel.ssl.subject) : siteIntel.ssl.subject) || '—'}</span></div>
            <div><span className="text-gray-500">Serial: </span><span className="text-gray-300 text-xs font-mono">{siteIntel.ssl.serialNumber || '—'}</span></div>
            <div><span className="text-gray-500">Valid From: </span><span className="text-gray-300">{siteIntel.ssl.validFrom || '—'}</span></div>
            <div><span className="text-gray-500">Valid Until: </span><span className="text-gray-300">{siteIntel.ssl.validTo || '—'}</span></div>
            {siteIntel.ssl.daysUntilExpiry != null && (
              <div><span className="text-gray-500">Days Until Expiry: </span><span className={siteIntel.ssl.daysUntilExpiry < 30 ? 'text-red-400' : 'text-green-400'}>{siteIntel.ssl.daysUntilExpiry}</span></div>
            )}
            {siteIntel.ssl.isExpired && <div><span className="text-red-400 font-bold">⚠ Certificate is EXPIRED</span></div>}
            {siteIntel.ssl.isExpiringSoon && !siteIntel.ssl.isExpired && <div><span className="text-amber-400 font-bold">⚠ Expiring soon</span></div>}
            {siteIntel.ssl.protocol && <div><span className="text-gray-500">Protocol: </span><span className="text-gray-300">{siteIntel.ssl.protocol}</span></div>}
            {siteIntel.ssl.cipher && <div><span className="text-gray-500">Cipher: </span><span className="text-gray-300 text-xs font-mono">{typeof siteIntel.ssl.cipher === 'object' ? siteIntel.ssl.cipher.name || JSON.stringify(siteIntel.ssl.cipher) : siteIntel.ssl.cipher}</span></div>}
            {siteIntel.ssl.fingerprint && <div className="col-span-2"><span className="text-gray-500">Fingerprint: </span><span className="text-gray-300 text-xs font-mono break-all">{siteIntel.ssl.fingerprint}</span></div>}
          </div>
          {siteIntel.ssl.altNames?.length > 0 && (
            <div className="mt-3">
              <h4 className="text-gray-500 text-xs font-medium mb-1">Subject Alt Names ({siteIntel.ssl.altNames.length})</h4>
              <div className="flex flex-wrap gap-1">
                {siteIntel.ssl.altNames.slice(0, 30).map((n, i) => <span key={i} className="badge badge-gray text-[10px]">{n}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'sitemap' && hasSitemap && (
        <div className="space-y-2">
          <div className="text-gray-500 text-xs mb-2">Total URLs in sitemap: {siteIntel.sitemap.totalUrls}</div>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {(siteIntel.sitemap.urls || []).slice(0, 100).map((u, i) => (
              <div key={i} className="bg-dark-750 rounded-lg px-3 py-2 border border-dark-600/30">
                <a href={u} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-xs font-mono hover:underline truncate block">{u}</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'robots' && hasRobots && (
        <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
          <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
            {JSON.stringify(siteIntel.robots, null, 2)}
          </pre>
        </div>
      )}

      {section === 'security' && hasSecurity && (
        <div className="space-y-3">
          {siteIntel.security.securityScore && (
            <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
              <div className="flex items-center gap-4 mb-3">
                <span className={`text-3xl font-bold ${siteIntel.security.securityScore.grade?.startsWith('A') ? 'text-green-400' : 'text-amber-400'}`}>
                  {siteIntel.security.securityScore.grade}
                </span>
                <span className="text-gray-300 text-sm">{siteIntel.security.securityScore.score}/100</span>
              </div>
              {siteIntel.security.securityScore.details && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(siteIntel.security.securityScore.details).map(([key, val], i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${val ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-gray-400">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {siteIntel.security.redirectChain?.length > 0 && (
            <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
              <h4 className="text-gray-400 text-xs font-medium mb-2">Redirect Chain</h4>
              {siteIntel.security.redirectChain.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-300 mb-1">
                  <span className="badge badge-gray text-[10px]">{r.status}</span>
                  <span className="font-mono truncate">{r.url}</span>
                </div>
              ))}
            </div>
          )}
          {siteIntel.security.cookies?.length > 0 && (
            <div className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
              <h4 className="text-gray-400 text-xs font-medium mb-2">Cookies ({siteIntel.security.cookies.length})</h4>
              <div className="space-y-2">
                {siteIntel.security.cookies.slice(0, 15).map((c, i) => (
                  <div key={i} className="text-xs flex items-center gap-2">
                    <span className="text-white font-mono">{c.name}</span>
                    <div className="flex gap-1">
                      {c.secure && <span className="badge badge-green text-[9px]">Secure</span>}
                      {c.httpOnly && <span className="badge badge-blue text-[9px]">HttpOnly</span>}
                      {c.sameSite && <span className="badge badge-gray text-[9px]">SameSite={c.sameSite}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'apis' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {apiEndpoints.length === 0 && openAPIs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No API endpoints discovered</div>
          ) : (
            <>
              {openAPIs.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-gray-400 text-xs font-medium mb-2">OpenAPI / Swagger</h4>
                  {openAPIs.map((a, i) => (
                    <div key={i} className="bg-dark-750 rounded-lg px-4 py-2.5 border border-dark-600/30 flex items-center gap-3 mb-1">
                      <span className="badge badge-green text-[10px]">OpenAPI</span>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm hover:underline truncate flex-1">{a.url}</a>
                    </div>
                  ))}
                </div>
              )}
              {apiEndpoints.map((ep, i) => (
                <div key={i} className="bg-dark-750 rounded-lg px-4 py-2.5 border border-dark-600/30 flex items-center gap-3">
                  <span className={`badge ${ep.method === 'POST' ? 'badge-amber' : 'badge-blue'} text-[10px] min-w-12 text-center`}>{ep.method}</span>
                  <span className="text-gray-300 text-xs font-mono truncate flex-1">{ep.url}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {section === 'headers' && (
        <div className="space-y-3">
          {responseHeaders.map((rh, i) => {
            if (!rh || Object.keys(rh).length === 0) return null;
            return (
              <div key={i} className="bg-dark-750 rounded-lg p-4 border border-dark-600/30">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {rh.server && <div><span className="text-gray-500">Server: </span><span className="text-white">{rh.server}</span></div>}
                  {rh.poweredBy && <div><span className="text-gray-500">Powered By: </span><span className="text-amber-400">{rh.poweredBy}</span></div>}
                  {rh.contentEncoding && <div><span className="text-gray-500">Encoding: </span><span className="text-gray-300">{rh.contentEncoding}</span></div>}
                  <div><span className="text-gray-500">Compressed: </span><span className={rh.isCompressed ? 'text-green-400' : 'text-red-400'}>{rh.isCompressed ? 'Yes' : 'No'}</span></div>
                  <div><span className="text-gray-500">Cached: </span><span className={rh.isCached ? 'text-green-400' : 'text-gray-400'}>{rh.isCached ? 'Yes' : 'No'}</span></div>
                </div>
                {rh.customHeaders && Object.keys(rh.customHeaders).length > 0 && (
                  <div className="mt-3 border-t border-dark-600/30 pt-3">
                    <h4 className="text-gray-500 text-xs font-medium mb-2">Custom Headers</h4>
                    <div className="space-y-1">
                      {Object.entries(rh.customHeaders).slice(0, 20).map(([k, v], j) => (
                        <div key={j} className="text-xs flex gap-2">
                          <span className="text-purple-400 font-mono min-w-36">{k}:</span>
                          <span className="text-gray-400 font-mono truncate">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {responseHeaders.every(rh => !rh || Object.keys(rh).length === 0) && (
            <div className="text-center py-8 text-gray-500 text-sm">No response header data available</div>
          )}
        </div>
      )}

      {section === 'fingerprint' && (
        <div className="space-y-2">
          {fingerprints.filter(f => f.contentHash).length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No fingerprint data available</div>
          ) : fingerprints.map((fp, i) => (
            fp.contentHash ? (
              <div key={i} className="bg-dark-750 rounded-lg p-4 border border-dark-600/30 grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Content Hash: </span><span className="text-emerald-400 font-mono text-xs">{fp.contentHash}</span></div>
                <div><span className="text-gray-500">Full Hash: </span><span className="text-gray-300 font-mono text-xs">{fp.fullHash}</span></div>
                <div><span className="text-gray-500">Content Length: </span><span className="text-gray-300">{fp.contentLength?.toLocaleString()} chars</span></div>
                <div><span className="text-gray-500">HTML Size: </span><span className="text-gray-300">{fp.htmlLength?.toLocaleString()} chars</span></div>
              </div>
            ) : null
          ))}
        </div>
      )}
    </div>
  );
}
