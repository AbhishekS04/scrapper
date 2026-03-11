import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

const API_BASE = '/api';

export function useScrapeJob() {
  const { getToken } = useAuth();
  const [jobId, setJobId] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState([]);
  const [status, setStatus] = useState('idle');
  const [stats, setStats] = useState({ pagesScraped: 0, totalFound: 0, percentage: 0 });
  const eventSourceRef = useRef(null);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, []);

  const authHeaders = useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const fetchJobResults = useCallback(async (id) => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/job/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setJobData(data);
        setStatus(data.job.status);
        if (data.job.pagesScraped) {
          setStats(prev => ({
            ...prev,
            pagesScraped: data.job.pagesScraped,
            totalFound: data.job.totalLinksFound,
            percentage: 100,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch job results:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const connectSSE = useCallback((id) => {
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`${API_BASE}/stream/${id}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setProgress(prev => {
          const next = [...prev, data];
          return next.length > 200 ? next.slice(-200) : next;
        });

        if (data.pagesScraped !== undefined) {
          setStats({
            pagesScraped: data.pagesScraped,
            totalFound: data.totalFound || 0,
            percentage: data.percentage || 0,
          });
        }

        if (data.type === 'completed') {
          setStatus('completed');
          es.close();
          fetchJobResults(id);
        } else if (data.type === 'failed') {
          setStatus('failed');
          setError(data.message || 'Scrape job failed');
          es.close();
        } else if (data.type === 'status' && data.status === 'running') {
          setStatus('running');
        }
      } catch {}
    };

    es.onerror = () => {
      fetchJobResults(id);
      es.close();
    };
  }, [fetchJobResults]);

  const startScrape = useCallback(async (url, options = {}) => {
    setError(null);
    setLoading(true);
    setProgress([]);
    setJobData(null);
    setStatus('running');
    setStats({ pagesScraped: 0, totalFound: 0, percentage: 0 });

    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ url, options }),
      });

      if (!res.ok) {
        let errMsg = 'Failed to start scrape';
        try { errMsg = (await res.json()).error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setJobId(data.jobId);
      connectSSE(data.jobId);
    } catch (err) {
      setError(err.message);
      setStatus('failed');
      setLoading(false);
    }
  }, [authHeaders, connectSSE]);

  const loadJob = useCallback(async (id) => {
    setError(null);
    setLoading(true);
    setJobId(id);
    setProgress([]);
    await fetchJobResults(id);
  }, [fetchJobResults]);

  const reset = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    setJobId(null);
    setJobData(null);
    setLoading(false);
    setError(null);
    setProgress([]);
    setStatus('idle');
    setStats({ pagesScraped: 0, totalFound: 0, percentage: 0 });
  }, []);

  return { jobId, jobData, loading, error, progress, status, stats, startScrape, loadJob, reset };
}