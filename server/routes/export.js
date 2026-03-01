import { Router } from 'express';
import { db } from '../services/db.js';
import { scrapeJobs, scrapeResults } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { stringify } from 'csv-stringify/sync';
import { getAuth } from '@clerk/express';

export const exportRoutes = Router();

/**
 * GET /api/export/:id/json — Download results as JSON (auth required)
 */
exportRoutes.get('/export/:id/json', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const jobId = req.params.id;

    const [job] = await db.select().from(scrapeJobs).where(and(eq(scrapeJobs.id, jobId), eq(scrapeJobs.userId, userId)));
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const results = await db.select().from(scrapeResults).where(eq(scrapeResults.jobId, jobId));

    const exportData = {
      job: {
        id: job.id,
        url: job.url,
        status: job.status,
        pagesScraped: job.pagesScraped,
        totalLinksFound: job.totalLinksFound,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
      results: results.map(r => ({
        pageUrl: r.pageUrl,
        title: r.title,
        metaDescription: r.metaDescription,
        headings: r.headings,
        paragraphs: r.paragraphs,
        linksInternal: r.linksInternal,
        linksExternal: r.linksExternal,
        images: r.images,
        emails: r.emails,
        phones: r.phones,
        socialLinks: r.socialLinks,
        metadata: r.metadata,
        techStack: r.techStack,
        tablesData: r.tablesData,
        formsData: r.formsData,
        wordCount: r.wordCount,
        loadTimeMs: r.loadTimeMs,
        seoScore: r.seoScore,
        scrapedAt: r.scrapedAt,
      })),
    };

    const filename = `webscrape-${job.url.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}-${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error('Error exporting JSON:', error);
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

/**
 * GET /api/export/:id/csv — Download results as CSV
 */
exportRoutes.get('/export/:id/csv', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const jobId = req.params.id;

    const [job] = await db.select().from(scrapeJobs).where(and(eq(scrapeJobs.id, jobId), eq(scrapeJobs.userId, userId)));
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const results = await db.select().from(scrapeResults).where(eq(scrapeResults.jobId, jobId));

    const csvRows = results.map(r => ({
      page_url: r.pageUrl,
      title: r.title || '',
      meta_description: r.metaDescription || '',
      seo_score: r.seoScore?.score || 0,
      seo_grade: r.seoScore?.grade || '',
      word_count: r.wordCount || 0,
      load_time_ms: r.loadTimeMs || 0,
      h1_count: Array.isArray(r.headings?.h1) ? r.headings.h1.length : 0,
      h2_count: Array.isArray(r.headings?.h2) ? r.headings.h2.length : 0,
      internal_links: Array.isArray(r.linksInternal) ? r.linksInternal.length : 0,
      external_links: Array.isArray(r.linksExternal) ? r.linksExternal.length : 0,
      images_count: Array.isArray(r.images) ? r.images.length : 0,
      emails: Array.isArray(r.emails) ? r.emails.join('; ') : '',
      phones: Array.isArray(r.phones) ? r.phones.join('; ') : '',
      social_links: Array.isArray(r.socialLinks) ? r.socialLinks.map(s => s.url).join('; ') : '',
      cms: Array.isArray(r.techStack?.cms) ? r.techStack.cms.join(', ') : '',
      frameworks: Array.isArray(r.techStack?.frameworks) ? r.techStack.frameworks.join(', ') : '',
      scraped_at: r.scrapedAt,
    }));

    const csv = stringify(csvRows, { header: true });

    const filename = `webscrape-${job.url.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});
