import { Router } from 'express';
import { db } from '../services/db.js';
import { scrapeJobs, scrapeResults } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { semanticSearch, generateJobEmbeddings, isConfigured } from '../services/semanticSearch.js';

export const searchRoutes = Router();

/**
 * POST /api/search/:jobId — Run a semantic search over a completed job's results
 */
searchRoutes.post('/search/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { query, topK = 5 } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (!isConfigured) {
      return res.status(503).json({ error: 'Semantic search is currently disabled (Groq does not support public embeddings).' });
    }

    // Fetch the job
    const [job] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, jobId));
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Fetch all results for this job
    const results = await db.select().from(scrapeResults).where(eq(scrapeResults.jobId, jobId));
    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found for this job' });
    }

    // Use pre-computed embeddings from the job record if available
    const storedEmbeddings = job.embeddings || [];

    // Run semantic search
    const ranked = await semanticSearch(query, results, storedEmbeddings, parseInt(topK));

    res.json({
      query,
      totalResults: results.length,
      matches: ranked,
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: error.message || 'Semantic search failed' });
  }
});

/**
 * POST /api/search/:jobId/index — (Re-)generate embeddings for a job's results
 */
searchRoutes.post('/search/:jobId/index', async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!isConfigured) {
      return res.status(503).json({ error: 'Semantic indexing is currently disabled (Groq does not support public embeddings).' });
    }

    const results = await db.select().from(scrapeResults).where(eq(scrapeResults.jobId, jobId));
    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found for this job' });
    }

    res.json({ message: `Indexing ${results.length} pages in the background...` });

    // Run indexing in background (don't block response)
    generateJobEmbeddings(results).then(async (embeddings) => {
      await db.update(scrapeJobs).set({ embeddings }).where(eq(scrapeJobs.id, jobId));
      console.log(`Indexed ${embeddings.length} pages for job ${jobId}`);
    }).catch(err => {
      console.error('Indexing failed:', err.message);
    });

  } catch (error) {
    console.error('Index error:', error);
    res.status(500).json({ error: 'Indexing failed' });
  }
});
