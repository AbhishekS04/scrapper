import { useState, useEffect } from 'react';

const INTERVALS = [
  { label: 'Every 5 min', value: 5 },
  { label: 'Every 15 min', value: 15 },
  { label: 'Every 30 min', value: 30 },
  { label: 'Every 1 hour', value: 60 },
  { label: 'Every 6 hours', value: 360 },
  { label: 'Every 24 hours', value: 1440 },
];

function timeAgo(ts) {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [form, setForm] = useState({ url: '', label: '', intervalMinutes: 60 });
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/monitors');
      if (res.ok) setMonitors(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.url.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ url: '', label: '', intervalMinutes: 60 });
        await load();
      }
    } catch {}
    setCreating(false);
  };

  const handleCheck = async (id) => {
    setCheckingId(id);
    try {
      const res = await fetch(`/api/monitors/${id}/check`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setMonitors(prev => prev.map(m => m.id === id ? updated : m));
      }
    } catch {}
    setCheckingId(null);
  };

  const handleToggle = async (monitor) => {
    try {
      const res = await fetch(`/api/monitors/${monitor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !monitor.isActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMonitors(prev => prev.map(m => m.id === monitor.id ? updated : m));
      }
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this monitor?')) return;
    try {
      await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      setMonitors(prev => prev.filter(m => m.id !== id));
    } catch {}
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 sm:px-6 py-8 sm:py-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="text-2xl">📡</span>
            Change Monitors
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track URLs for content changes on a schedule. Get notified when something changes.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-400 hover:to-purple-500 transition-all flex items-center gap-2"
        >
          <span className="text-base">+</span>
          Add Monitor
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 space-y-4 animate-fade-in"
        >
          <h3 className="text-sm font-semibold text-white">New Monitor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">URL to Monitor *</label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com/pricing"
                className="w-full bg-dark-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 font-mono"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Label (optional)</label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Competitor Pricing Page"
                className="w-full bg-dark-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Check Interval</label>
            <div className="flex flex-wrap gap-2">
              {INTERVALS.map(iv => (
                <button
                  key={iv.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, intervalMinutes: iv.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.intervalMinutes === iv.value
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'text-gray-500 border-white/5 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? (
                <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Creating…</>
              ) : 'Create Monitor'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg text-gray-400 text-sm hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Monitor List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <svg className="animate-spin w-8 h-8 mx-auto mb-3 text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading monitors…
        </div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-5xl mb-4">📡</div>
          <p className="text-lg text-gray-500 font-medium mb-2">No monitors yet</p>
          <p className="text-sm">Add a URL above to start tracking changes automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {monitors.map(m => {
            const hasChange = m.lastDiff?.hasChanges;
            const isExpanded = expandedId === m.id;

            return (
              <div
                key={m.id}
                className={`glass-panel rounded-2xl overflow-hidden transition-all border ${
                  hasChange ? 'border-amber-500/20' : 'border-white/5'
                }`}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    !m.isActive ? 'bg-gray-600' :
                    hasChange ? 'bg-amber-400 animate-pulse' :
                    m.lastCheckedAt ? 'bg-emerald-400' : 'bg-gray-500'
                  }`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{m.label || m.url}</span>
                      {hasChange && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium flex-shrink-0">
                          🔔 Change detected
                        </span>
                      )}
                      {!m.isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-500 border border-gray-500/20 font-medium">Paused</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 flex-wrap">
                      <span className="font-mono truncate max-w-[200px]">{m.url}</span>
                      <span>·</span>
                      <span>Every {m.intervalMinutes < 60 ? `${m.intervalMinutes}m` : `${m.intervalMinutes / 60}h`}</span>
                      <span>·</span>
                      <span>Checked: {timeAgo(m.lastCheckedAt)}</span>
                      {m.changeCount > 0 && <><span>·</span><span className="text-amber-400">{m.changeCount} change{m.changeCount > 1 ? 's' : ''}</span></>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Expand diff */}
                    {hasChange && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                      >
                        {isExpanded ? 'Hide diff' : 'View diff'}
                      </button>
                    )}
                    {/* Manual check */}
                    <button
                      onClick={() => handleCheck(m.id)}
                      disabled={checkingId === m.id}
                      title="Check now"
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
                    >
                      {checkingId === m.id ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      )}
                    </button>
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggle(m)}
                      title={m.isActive ? 'Pause' : 'Resume'}
                      className={`p-2 rounded-lg transition-all ${m.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {m.isActive ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                      )}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(m.id)}
                      title="Delete"
                      className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Diff panel */}
                {isExpanded && m.lastDiff && (
                  <div className="px-4 pb-4 border-t border-amber-500/10">
                    <div className="mt-3 space-y-3">
                      <p className="text-xs text-amber-300/80 font-medium">{m.lastDiff.summary}</p>

                      {m.lastDiff.added?.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1.5">+ Added</div>
                          <div className="space-y-1">
                            {m.lastDiff.added.slice(0, 5).map((s, i) => (
                              <div key={i} className="text-[11px] text-gray-300 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.lastDiff.removed?.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1.5">− Removed</div>
                          <div className="space-y-1">
                            {m.lastDiff.removed.slice(0, 5).map((s, i) => (
                              <div key={i} className="text-[11px] text-gray-400 line-through bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
