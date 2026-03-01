/**
 * Scraper Engine Service
 * Uses Playwright for JS-rendered pages, Axios+Cheerio for static pages
 * Supports deep crawling, link following, and real-time progress via SSE
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractPageData } from './extractor.js';
import { db } from './db.js';
import { scrapeJobs, scrapeResults } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
];

// SSE clients per job
const sseClients = new Map();

export function addSSEClient(jobId, res) {
  if (!sseClients.has(jobId)) sseClients.set(jobId, []);
  sseClients.get(jobId).push(res);
}

export function removeSSEClient(jobId, res) {
  const clients = sseClients.get(jobId);
  if (clients) {
    const idx = clients.indexOf(res);
    if (idx > -1) clients.splice(idx, 1);
    if (clients.length === 0) sseClients.delete(jobId);
  }
}

function sendProgress(jobId, data) {
  const clients = sseClients.get(jobId) || [];
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
    try { res.write(msg); } catch {}
  });
}

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay(baseMs) {
  const jitter = Math.floor(Math.random() * baseMs * 0.5);
  return baseMs + jitter;
}

/**
 * Check if a page needs JS rendering by examining initial HTML
 */
function needsJSRendering(html) {
  const indicators = [
    '__NEXT_DATA__', '_reactRootContainer', 'data-reactroot',
    '__vue_app__', '__NUXT__', 'ng-version', 'ng-app',
    '<div id="root"></div>', '<div id="app"></div>',
    '<noscript>You need to enable JavaScript',
  ];
  const lower = html.toLowerCase();
  const bodyContent = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyContent) {
    const bodyText = bodyContent[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '').trim();
    if (bodyText.length < 100 && indicators.some(ind => lower.includes(ind.toLowerCase()))) {
      return true;
    }
  }
  return false;
}

/**
 * Fetch page with Axios (fast, for static pages)
 */
async function fetchWithAxios(url, timeout = 30000) {
  const startTime = Date.now();
  const response = await axios.get(url, {
    timeout,
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
    },
    maxRedirects: 5,
    validateStatus: (status) => status < 500,
  });

  return {
    html: response.data,
    headers: response.headers || {},
    statusCode: response.status,
    loadTimeMs: Date.now() - startTime,
    url: response.request?.res?.responseUrl || url,
  };
}

/**
 * Check if Playwright is available (not on Vercel serverless)
 */
let playwrightAvailable = null;
async function checkPlaywright() {
  if (playwrightAvailable !== null) return playwrightAvailable;
  if (process.env.VERCEL) {
    playwrightAvailable = false;
    return false;
  }
  try {
    await import('playwright');
    playwrightAvailable = true;
    return true;
  } catch {
    playwrightAvailable = false;
    return false;
  }
}

/**
 * Fetch page with Playwright (for JS-rendered pages)
 */
async function fetchWithPlaywright(url, timeout = 30000) {
  const available = await checkPlaywright();
  if (!available) throw new Error('Playwright not available in this environment');

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    const startTime = Date.now();

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout,
    });

    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);

    const html = await page.content();
    const loadTimeMs = Date.now() - startTime;
    const headers = response?.headers() || {};
    const statusCode = response?.status() || 200;

    await browser.close();

    return { html, headers, statusCode, loadTimeMs, url: page.url() };
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    throw error;
  }
}

/**
 * Smart fetch: try Axios first, fallback to Playwright if JS-rendered
 */
async function smartFetch(url, forcePlaywright = false) {
  if (forcePlaywright) {
    return fetchWithPlaywright(url);
  }

  try {
    const result = await fetchWithAxios(url);

    // Check if the page needs JS rendering
    if (typeof result.html === 'string' && needsJSRendering(result.html)) {
      try {
        return await fetchWithPlaywright(url);
      } catch {
        // Fallback to Axios result if Playwright fails
        return result;
      }
    }

    return result;
  } catch (error) {
    // If Axios fails, try Playwright
    try {
      return await fetchWithPlaywright(url);
    } catch {
      throw error; // Re-throw original error
    }
  }
}

/**
 * Check link status code
 */
async function checkLinkStatus(url) {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: { 'User-Agent': getRandomUserAgent() },
      validateStatus: () => true,
    });
    return response.status;
  } catch {
    return null;
  }
}

/**
 * Main scrape function
 */
export async function startScrapeJob(jobId, url, options = {}) {
  const {
    deepScan = false,
    followLinks = false,
    extractImages = true,
    extractEmailsOpt = true,
    depth = parseInt(process.env.DEFAULT_DEPTH || '2'),
  } = options;

  const maxPages = parseInt(process.env.MAX_PAGES_PER_JOB || '100');
  const requestDelay = parseInt(process.env.REQUEST_DELAY_MS || '1000');

  const visited = new Set();
  const queue = [{ url, currentDepth: 0 }];
  let pagesScraped = 0;

  try {
    // Update job to running
    await db.update(scrapeJobs).set({
      status: 'running',
      startedAt: new Date(),
    }).where(eq(scrapeJobs.id, jobId));

    sendProgress(jobId, {
      type: 'status',
      status: 'running',
      message: `Starting scrape of ${url}`,
    });

    const baseUrl = new URL(url);

    while (queue.length > 0 && pagesScraped < maxPages) {
      const { url: currentUrl, currentDepth } = queue.shift();

      // Normalize URL
      let normalizedUrl;
      try {
        normalizedUrl = new URL(currentUrl).href.replace(/\/$/, '');
      } catch {
        continue;
      }

      if (visited.has(normalizedUrl)) continue;
      visited.add(normalizedUrl);

      // Only follow links on same domain
      try {
        if (new URL(normalizedUrl).hostname !== baseUrl.hostname) continue;
      } catch {
        continue;
      }

      // Skip non-HTML resources
      const skipExtensions = ['.pdf', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp4', '.mp3', '.avi', '.mov', '.css', '.js', '.xml', '.rss'];
      if (skipExtensions.some(ext => normalizedUrl.toLowerCase().endsWith(ext))) continue;

      sendProgress(jobId, {
        type: 'fetching',
        url: normalizedUrl,
        pagesScraped,
        totalFound: visited.size,
        queueRemaining: queue.length,
        percentage: maxPages > 0 ? Math.round((pagesScraped / Math.min(visited.size, maxPages)) * 100) : 0,
      });

      try {
        // Fetch the page
        const result = await smartFetch(normalizedUrl);

        if (typeof result.html !== 'string') {
          sendProgress(jobId, {
            type: 'error',
            url: normalizedUrl,
            message: 'Non-HTML response received',
          });
          continue;
        }

        sendProgress(jobId, {
          type: 'parsing',
          url: normalizedUrl,
          loadTimeMs: result.loadTimeMs,
        });

        // Extract data
        const pageData = extractPageData(result.html, normalizedUrl, result.headers);

        // Store result
        sendProgress(jobId, {
          type: 'storing',
          url: normalizedUrl,
        });

        await db.insert(scrapeResults).values({
          jobId,
          pageUrl: normalizedUrl,
          title: pageData.title,
          metaDescription: pageData.metaDescription,
          headings: pageData.headings,
          paragraphs: pageData.paragraphs,
          linksInternal: pageData.linksInternal,
          linksExternal: pageData.linksExternal,
          images: extractImages ? pageData.images : [],
          emails: extractEmailsOpt ? pageData.emails : [],
          phones: pageData.phones,
          socialLinks: pageData.socialLinks,
          metadata: pageData.metadata,
          techStack: pageData.techStack,
          tablesData: pageData.tablesData,
          formsData: pageData.formsData,
          wordCount: pageData.wordCount,
          loadTimeMs: result.loadTimeMs,
          // ─── Advanced fields ───
          scripts: pageData.scripts || [],
          stylesheets: pageData.stylesheets || [],
          comments: pageData.comments || [],
          leakedData: pageData.leakedData || {},
          securityInfo: pageData.securityInfo || {},
          hiddenFields: pageData.hiddenFields || [],
          iframes: pageData.iframes || [],
          downloads: pageData.downloads || [],
          videos: pageData.videos || [],
          suggestions: pageData.suggestions || [],
        });

        pagesScraped++;

        // Update job progress
        await db.update(scrapeJobs).set({
          pagesScraped,
          totalLinksFound: visited.size,
        }).where(eq(scrapeJobs.id, jobId));

        sendProgress(jobId, {
          type: 'scraped',
          url: normalizedUrl,
          title: pageData.title,
          pagesScraped,
          totalFound: visited.size,
          percentage: Math.round((pagesScraped / Math.min(visited.size || 1, maxPages)) * 100),
        });

        // Add internal links to queue if following links and within depth
        if ((followLinks || deepScan) && currentDepth < depth) {
          for (const link of pageData.linksInternal) {
            try {
              const linkNorm = new URL(link.url).href.replace(/\/$/, '');
              if (!visited.has(linkNorm)) {
                queue.push({ url: link.url, currentDepth: currentDepth + 1 });
              }
            } catch {
              // Skip invalid URLs
            }
          }
        }

        // Random delay between requests
        if (queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, randomDelay(requestDelay)));
        }

      } catch (error) {
        sendProgress(jobId, {
          type: 'error',
          url: normalizedUrl,
          message: error.message?.substring(0, 200),
        });
        // Continue with next URL
      }
    }

    // Mark job as completed
    await db.update(scrapeJobs).set({
      status: 'completed',
      completedAt: new Date(),
      pagesScraped,
      totalLinksFound: visited.size,
    }).where(eq(scrapeJobs.id, jobId));

    sendProgress(jobId, {
      type: 'completed',
      pagesScraped,
      totalFound: visited.size,
      percentage: 100,
    });

  } catch (error) {
    // Mark job as failed
    await db.update(scrapeJobs).set({
      status: 'failed',
      completedAt: new Date(),
      errorMessage: error.message?.substring(0, 500),
      pagesScraped,
    }).where(eq(scrapeJobs.id, jobId));

    sendProgress(jobId, {
      type: 'failed',
      message: error.message?.substring(0, 200),
    });
  }
}
