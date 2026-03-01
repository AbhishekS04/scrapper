import { Router } from 'express';
import { db } from '../services/db.js';
import { scrapeJobs, scrapeResults } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const jobsRoutes = Router();

/**
 * GET /api/jobs — Get all past scrape jobs
 */
jobsRoutes.get('/jobs', async (req, res) => {
  try {
    const jobs = await db
      .select()
      .from(scrapeJobs)
      .orderBy(desc(scrapeJobs.createdAt));

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /api/job/:id — Get job status + results
 */
jobsRoutes.get('/job/:id', async (req, res) => {
  try {
    const jobId = req.params.id;

    const [job] = await db
      .select()
      .from(scrapeJobs)
      .where(eq(scrapeJobs.id, jobId));

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const results = await db
      .select()
      .from(scrapeResults)
      .where(eq(scrapeResults.jobId, jobId));

    res.json({ job, results });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * DELETE /api/job/:id — Delete a job and its results
 */
jobsRoutes.delete('/job/:id', async (req, res) => {
  try {
    const jobId = req.params.id;

    const [job] = await db
      .select()
      .from(scrapeJobs)
      .where(eq(scrapeJobs.id, jobId));

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Results will be cascade deleted
    await db.delete(scrapeJobs).where(eq(scrapeJobs.id, jobId));

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});
