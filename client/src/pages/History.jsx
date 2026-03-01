import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HistoryTable from '../components/HistoryTable.jsx';
import ResultsTabs from '../components/ResultsTabs.jsx';
import ExportBar from '../components/ExportBar.jsx';

export default function History() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadJob = async (jobId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/job/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedJob(jobId);
        setJobData(data);
      }
    } catch (err) {
      console.error('Failed to load job:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Scrape History</h1>
            <p className="text-gray-500 text-sm mt-1">All past scrape jobs stored in NeonDB</p>
          </div>
          <button onClick={() => navigate('/')} className="btn-primary text-xs">
            + New Scrape
          </button>
        </div>

        {/* Loading overlay for job viewing */}
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="flex items-center gap-3 text-gray-400">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading job results...
            </div>
          </div>
        )}

        {/* Selected job results */}
        {jobData && !loading && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Results for <span className="text-gray-300 font-mono">{jobData.job.url}</span>
              </h2>
              <button
                onClick={() => { setSelectedJob(null); setJobData(null); }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                ← Back to History
              </button>
            </div>
            <ResultsTabs jobData={jobData} />
            <ExportBar jobId={selectedJob} jobData={jobData} />
          </div>
        )}

        {/* History table */}
        {!jobData && !loading && (
          <div className="glass-panel overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-600/50">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">📂 All Jobs</span>
            </div>
            <div className="p-4">
              <HistoryTable onLoadJob={loadJob} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
