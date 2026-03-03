import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function HistoryTable({ onLoadJob }) {
  const { getToken } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/jobs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const deleteJob = async (id) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/job/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setJobs(prev => prev.filter(j => j.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const StatusBadge = ({ status }) => {
    const classes = {
      pending: 'status-pending',
      running: 'status-running',
      completed: 'status-completed',
      failed: 'status-failed',
    };
    return <span className={classes[status] || 'status-badge'}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading history...
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-400 mb-2">No scrape history yet</h3>
        <p className="text-sm text-gray-500 mb-4">Start your first scrape from the home page</p>
        <Link to="/" className="btn-primary inline-flex">Start Scraping</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>URL</th>
              <th>Status</th>
              <th>Pages</th>
              <th>Links</th>
              <th>Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id}>
                <td>
                  <div className="max-w-xs truncate font-mono text-gray-300">
                    {job.url}
                  </div>
                </td>
                <td><StatusBadge status={job.status} /></td>
                <td className="font-mono">{job.pagesScraped || 0}</td>
                <td className="font-mono">{job.totalLinksFound || 0}</td>
                <td className="text-gray-500 text-xs whitespace-nowrap">{formatDate(job.createdAt)}</td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    {job.status === 'completed' && onLoadJob && (
                      <button
                        onClick={() => onLoadJob(job.id)}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        View
                      </button>
                    )}
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="btn-danger text-xs py-1 px-3"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden space-y-3">
        {jobs.map(job => (
          <div key={job.id} className="bg-dark-750 rounded-xl border border-dark-600/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="font-mono text-gray-300 text-xs truncate flex-1 min-w-0">
                {job.url}
              </div>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-gray-500 font-mono">
              <span>{job.pagesScraped || 0} pages</span>
              <span>{job.totalLinksFound || 0} links</span>
              <span className="ml-auto">{formatDate(job.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-dark-600/30">
              {job.status === 'completed' && onLoadJob && (
                <button
                  onClick={() => onLoadJob(job.id)}
                  className="btn-secondary text-xs py-1.5 px-3 flex-1"
                >
                  View
                </button>
              )}
              <button
                onClick={() => deleteJob(job.id)}
                className="btn-danger text-xs py-1.5 px-3 flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
