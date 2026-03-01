import { Router } from 'express';
import { db } from '../services/db.js';
import { scrapeJobs } from '../db/schema.js';
import { startScrapeJob, addSSEClient, removeSSEClient } from '../services/scraper.js';
import { eq } from 'drizzle-orm';

export const scrapeRoutes = Router();

/**
 * POST /api/scrape — Start a new scrape job
 */
scrapeRoutes.post('/scrape', async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are supported' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Check concurrent job limit
    const activeJobs = req.activeJobs;
    const runningCount = [...activeJobs.values()].filter(v => v === 'running').length;
    if (runningCount >= req.MAX_CONCURRENT_JOBS) {
      return res.status(429).json({
        error: 'Too many concurrent scrape jobs. Please wait for existing jobs to complete.',
      });
    }

    // Create job in DB
    const [job] = await db.insert(scrapeJobs).values({
      url: parsedUrl.href,
      status: 'pending',
      options,
    }).returning();

    // Track active job
    activeJobs.set(job.id, 'running');

    // Start scraping in background
    startScrapeJob(job.id, parsedUrl.href, options).finally(() => {
      activeJobs.delete(job.id);
    });

    res.status(201).json({
      jobId: job.id,
      status: 'pending',
      url: parsedUrl.href,
      message: 'Scrape job started',
    });
  } catch (error) {
    console.error('Error starting scrape:', error);
    res.status(500).json({ error: 'Failed to start scrape job' });
  }
});

/**
 * GET /api/stream/:id — SSE stream for live progress updates
 */
scrapeRoutes.get('/stream/:id', async (req, res) => {
  const jobId = req.params.id;

  // Verify job exists
  const [job] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, jobId));
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Setup SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial state
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    jobId,
    status: job.status,
  })}\n\n`);

  // If job is already completed/failed, send that and close
  if (job.status === 'completed' || job.status === 'failed') {
    res.write(`data: ${JSON.stringify({
      type: job.status,
      pagesScraped: job.pagesScraped,
      totalFound: job.totalLinksFound,
      percentage: 100,
    })}\n\n`);
    res.end();
    return;
  }

  // Register SSE client
  addSSEClient(jobId, res);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch {}
  }, 15000);

  // Cleanup on close
  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(jobId, res);
  });
});
