/**
 * Browser Intelligence Service — Playwright Deep Extraction
 * Captures network traffic, console logs, localStorage, cookies,
 * PWA/service worker info, and full-page screenshots
 */

let playwrightAvailable = null;

async function checkPlaywright() {
  if (playwrightAvailable !== null) return playwrightAvailable;
  if (process.env.VERCEL) { playwrightAvailable = false; return false; }
  try {
    await import('playwright');
    playwrightAvailable = true;
    return true;
  } catch {
    playwrightAvailable = false;
    return false;
  }
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Deep browser intelligence gathering via Playwright
 * Captures everything the browser sees during page load
 */
export async function gatherBrowserIntel(url, options = {}) {
  const available = await checkPlaywright();
  if (!available) {
    return { error: 'Playwright not available', networkRequests: [], consoleLogs: [], storage: {}, cookies: [], pwa: null, screenshot: null };
  }

  const {
    captureScreenshot = true,
    captureNetwork = true,
    captureConsole = true,
    captureStorage = true,
    captureCookies = true,
    capturePwa = true,
    timeout = 45000,
  } = options;

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    const result = {
      networkRequests: [],
      consoleLogs: [],
      storage: { localStorage: {}, sessionStorage: {} },
      cookies: [],
      pwa: null,
      screenshot: null,
    };

    // ─── Capture Network Traffic ───
    if (captureNetwork) {
      page.on('request', (req) => {
        try {
          result.networkRequests.push({
            url: req.url(),
            method: req.method(),
            resourceType: req.resourceType(),
            headers: Object.fromEntries(
              Object.entries(req.headers()).filter(([k]) =>
                ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'content-type', 'accept', 'referer', 'origin'].includes(k.toLowerCase())
              )
            ),
            postData: req.postData()?.substring(0, 500) || null,
            isApi: /\/api\/|\/v[1-9]\/|graphql|\.json$/i.test(req.url()),
            timestamp: Date.now(),
          });
        } catch {}
      });

      page.on('response', async (resp) => {
        try {
          const reqEntry = result.networkRequests.find(r => r.url === resp.url() && !r.status);
          if (reqEntry) {
            reqEntry.status = resp.status();
            reqEntry.statusText = resp.statusText();
            reqEntry.responseHeaders = Object.fromEntries(
              Object.entries(resp.headers()).filter(([k]) =>
                ['content-type', 'content-length', 'set-cookie', 'x-powered-by', 'server', 'cache-control'].includes(k.toLowerCase())
              )
            );
          }
        } catch {}
      });

      page.on('requestfailed', (req) => {
        try {
          result.networkRequests.push({
            url: req.url(),
            method: req.method(),
            resourceType: req.resourceType(),
            failed: true,
            failureText: req.failure()?.errorText || 'unknown',
          });
        } catch {}
      });
    }

    // ─── Capture Console Logs ───
    if (captureConsole) {
      page.on('console', (msg) => {
        try {
          result.consoleLogs.push({
            type: msg.type(),
            text: msg.text()?.substring(0, 1000),
            location: msg.location(),
            timestamp: Date.now(),
          });
        } catch {}
      });

      page.on('pageerror', (err) => {
        result.consoleLogs.push({
          type: 'error',
          text: err.message?.substring(0, 1000),
          stack: err.stack?.substring(0, 500),
          timestamp: Date.now(),
        });
      });
    }

    // ─── Navigate ───
    await page.goto(url, { waitUntil: 'networkidle', timeout });
    await page.waitForTimeout(3000);

    // Scroll to trigger lazy-loaded content
    await page.evaluate(async () => {
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight);
        await delay(400);
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(2000);

    // ─── Capture localStorage / sessionStorage ───
    if (captureStorage) {
      try {
        result.storage = await page.evaluate(() => {
          const ls = {};
          const ss = {};
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              ls[key] = localStorage.getItem(key)?.substring(0, 500);
            }
          } catch {}
          try {
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              ss[key] = sessionStorage.getItem(key)?.substring(0, 500);
            }
          } catch {}
          return { localStorage: ls, sessionStorage: ss };
        });
      } catch {}
    }

    // ─── Capture Cookies ───
    if (captureCookies) {
      try {
        const cookies = await context.cookies();
        result.cookies = cookies.map(c => ({
          name: c.name,
          domain: c.domain,
          path: c.path,
          value: c.value?.substring(0, 200),
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite,
          expires: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : 'session',
          size: (c.name + c.value).length,
        }));
      } catch {}
    }

    // ─── PWA / Service Worker Detection ───
    if (capturePwa) {
      try {
        result.pwa = await page.evaluate(() => {
          const pwaInfo = {
            hasServiceWorker: false,
            hasManifest: false,
            manifestUrl: null,
            manifestData: null,
            isInstallable: false,
            themeColor: null,
            display: null,
            startUrl: null,
            icons: [],
          };

          // Check for manifest link
          const manifestLink = document.querySelector('link[rel="manifest"]');
          if (manifestLink) {
            pwaInfo.hasManifest = true;
            pwaInfo.manifestUrl = manifestLink.href;
          }

          // Check for service worker registration
          if ('serviceWorker' in navigator) {
            pwaInfo.hasServiceWorker = !!navigator.serviceWorker.controller;
          }

          // Theme color from meta
          const themeColor = document.querySelector('meta[name="theme-color"]');
          if (themeColor) pwaInfo.themeColor = themeColor.content;

          // Apple mobile web app capable
          const appleMobile = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
          if (appleMobile) pwaInfo.isInstallable = appleMobile.content === 'yes';

          return pwaInfo;
        });

        // Fetch manifest.json if found
        if (result.pwa?.manifestUrl) {
          try {
            const manifestResp = await page.evaluate(async (url) => {
              const resp = await fetch(url);
              return await resp.json();
            }, result.pwa.manifestUrl);
            result.pwa.manifestData = {
              name: manifestResp.name,
              shortName: manifestResp.short_name,
              display: manifestResp.display,
              startUrl: manifestResp.start_url,
              backgroundColor: manifestResp.background_color,
              themeColor: manifestResp.theme_color,
              icons: (manifestResp.icons || []).map(i => ({ src: i.src, sizes: i.sizes, type: i.type })),
              scope: manifestResp.scope,
            };
            result.pwa.display = manifestResp.display;
            result.pwa.startUrl = manifestResp.start_url;
            result.pwa.icons = (manifestResp.icons || []).map(i => ({ src: i.src, sizes: i.sizes }));
            result.pwa.isInstallable = true;
          } catch {}
        }
      } catch {}
    }

    // ─── Full-Page Screenshot ───
    if (captureScreenshot) {
      try {
        const screenshotBuffer = await page.screenshot({
          fullPage: false,
          type: 'png',
          clip: { x: 0, y: 0, width: 1920, height: 1080 },
        });
        result.screenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
      } catch {}
    }

    // ─── Summarize network ───
    const apiRequests = result.networkRequests.filter(r => r.isApi);
    const failedRequests = result.networkRequests.filter(r => r.failed);
    const wsRequests = result.networkRequests.filter(r => r.url?.startsWith('ws'));

    result.networkSummary = {
      totalRequests: result.networkRequests.length,
      apiRequests: apiRequests.length,
      failedRequests: failedRequests.length,
      websocketConnections: wsRequests.length,
      byResourceType: {},
      uniqueDomains: [...new Set(result.networkRequests.map(r => { try { return new URL(r.url).hostname; } catch { return null; } }).filter(Boolean))],
      thirdPartyDomains: [],
    };

    // Count by resource type
    for (const req of result.networkRequests) {
      const type = req.resourceType || 'unknown';
      result.networkSummary.byResourceType[type] = (result.networkSummary.byResourceType[type] || 0) + 1;
    }

    // Identify third-party domains
    try {
      const pageDomain = new URL(url).hostname;
      result.networkSummary.thirdPartyDomains = result.networkSummary.uniqueDomains.filter(d => !d.endsWith(pageDomain) && d !== pageDomain);
    } catch {}

    // Trim network requests to avoid huge payloads (keep top 200)
    result.networkRequests = result.networkRequests.slice(0, 200);
    result.consoleLogs = result.consoleLogs.slice(0, 100);

    await browser.close();
    return result;

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    return {
      error: error.message?.substring(0, 200),
      networkRequests: [],
      consoleLogs: [],
      storage: {},
      cookies: [],
      pwa: null,
      screenshot: null,
      networkSummary: { totalRequests: 0, apiRequests: 0, failedRequests: 0, byResourceType: {}, uniqueDomains: [], thirdPartyDomains: [] },
    };
  }
}
