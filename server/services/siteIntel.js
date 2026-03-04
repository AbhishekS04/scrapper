/**
 * Site Intelligence Service — Elite Reconnaissance
 * Gathers site-level intelligence: sitemap, robots.txt, DNS, SSL, WHOIS,
 * security headers deep analysis, technology fingerprinting, and more
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import dns from 'dns/promises';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ─── Sitemap Parser ───────────────────────────────────────────
export async function parseSitemap(baseUrl, maxUrls = 500) {
  const sitemapUrls = [];
  const discoveredPages = [];
  const origin = new URL(baseUrl).origin;

  // Common sitemap locations
  const sitemapLocations = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
    `${origin}/sitemaps.xml`,
    `${origin}/wp-sitemap.xml`,
    `${origin}/sitemap/sitemap-index.xml`,
    `${origin}/post-sitemap.xml`,
    `${origin}/page-sitemap.xml`,
    `${origin}/news-sitemap.xml`,
    `${origin}/video-sitemap.xml`,
    `${origin}/image-sitemap.xml`,
  ];

  // Try to get sitemap URL from robots.txt first
  try {
    const robotsResp = await axios.get(`${origin}/robots.txt`, {
      timeout: 10000,
      headers: { 'User-Agent': UA },
      validateStatus: s => s < 500,
    });
    if (robotsResp.status === 200 && typeof robotsResp.data === 'string') {
      const sitemapRefs = robotsResp.data.match(/Sitemap:\s*(.+)/gi) || [];
      sitemapRefs.forEach(ref => {
        const url = ref.replace(/Sitemap:\s*/i, '').trim();
        if (url && !sitemapLocations.includes(url)) {
          sitemapLocations.unshift(url); // Prioritize robots.txt sitemaps
        }
      });
    }
  } catch {}

  for (const loc of sitemapLocations) {
    if (discoveredPages.length >= maxUrls) break;
    try {
      const resp = await axios.get(loc, {
        timeout: 15000,
        headers: { 'User-Agent': UA },
        validateStatus: s => s < 500,
      });
      if (resp.status !== 200 || typeof resp.data !== 'string') continue;

      const $ = cheerio.load(resp.data, { xmlMode: true });

      // Check if it's a sitemap index
      const sitemapIndexUrls = $('sitemapindex sitemap loc').map((_, el) => $(el).text().trim()).get();
      if (sitemapIndexUrls.length > 0) {
        sitemapUrls.push({ type: 'index', url: loc, children: sitemapIndexUrls.length });
        // Parse child sitemaps
        for (const childUrl of sitemapIndexUrls.slice(0, 10)) {
          if (discoveredPages.length >= maxUrls) break;
          try {
            const childResp = await axios.get(childUrl, {
              timeout: 15000,
              headers: { 'User-Agent': UA },
              validateStatus: s => s < 500,
            });
            if (childResp.status === 200 && typeof childResp.data === 'string') {
              const $child = cheerio.load(childResp.data, { xmlMode: true });
              $child('urlset url').each((_, el) => {
                if (discoveredPages.length >= maxUrls) return false;
                const pageUrl = $child(el).find('loc').text().trim();
                const lastmod = $child(el).find('lastmod').text().trim() || null;
                const changefreq = $child(el).find('changefreq').text().trim() || null;
                const priority = $child(el).find('priority').text().trim() || null;
                if (pageUrl) discoveredPages.push({ url: pageUrl, lastmod, changefreq, priority, source: childUrl });
              });
            }
          } catch {}
        }
        break; // Found a working sitemap index
      }

      // Regular sitemap
      $('urlset url').each((_, el) => {
        if (discoveredPages.length >= maxUrls) return false;
        const pageUrl = $(el).find('loc').text().trim();
        const lastmod = $(el).find('lastmod').text().trim() || null;
        const changefreq = $(el).find('changefreq').text().trim() || null;
        const priority = $(el).find('priority').text().trim() || null;
        if (pageUrl) discoveredPages.push({ url: pageUrl, lastmod, changefreq, priority, source: loc });
      });

      if (discoveredPages.length > 0) {
        sitemapUrls.push({ type: 'sitemap', url: loc, pages: discoveredPages.length });
        break;
      }
    } catch {}
  }

  return {
    sitemaps: sitemapUrls,
    pages: discoveredPages,
    totalPages: discoveredPages.length,
  };
}

// ─── Robots.txt Parser ───────────────────────────────────────
export async function parseRobotsTxt(baseUrl) {
  const origin = new URL(baseUrl).origin;
  const result = {
    found: false,
    raw: null,
    rules: [],
    sitemaps: [],
    crawlDelay: null,
    allowedPaths: [],
    disallowedPaths: [],
    userAgents: [],
  };

  try {
    const resp = await axios.get(`${origin}/robots.txt`, {
      timeout: 10000,
      headers: { 'User-Agent': UA },
      validateStatus: s => s < 500,
    });

    if (resp.status !== 200 || typeof resp.data !== 'string') return result;

    result.found = true;
    result.raw = resp.data.substring(0, 5000);

    let currentUA = '*';
    const lines = resp.data.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const [directive, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      const lowerDirective = directive.toLowerCase().trim();

      if (lowerDirective === 'user-agent') {
        currentUA = value;
        if (!result.userAgents.includes(value)) result.userAgents.push(value);
      } else if (lowerDirective === 'disallow' && value) {
        result.disallowedPaths.push({ path: value, userAgent: currentUA });
        result.rules.push({ type: 'disallow', path: value, userAgent: currentUA });
      } else if (lowerDirective === 'allow' && value) {
        result.allowedPaths.push({ path: value, userAgent: currentUA });
        result.rules.push({ type: 'allow', path: value, userAgent: currentUA });
      } else if (lowerDirective === 'sitemap') {
        result.sitemaps.push(value);
      } else if (lowerDirective === 'crawl-delay') {
        result.crawlDelay = parseFloat(value) || null;
      }
    }
  } catch {}

  return result;
}

// ─── DNS Reconnaissance ──────────────────────────────────────
export async function dnsRecon(hostname) {
  const records = {
    a: [],
    aaaa: [],
    mx: [],
    txt: [],
    ns: [],
    cname: [],
    soa: null,
  };

  const queries = [
    { type: 'A', fn: () => dns.resolve4(hostname) },
    { type: 'AAAA', fn: () => dns.resolve6(hostname) },
    { type: 'MX', fn: () => dns.resolveMx(hostname) },
    { type: 'TXT', fn: () => dns.resolveTxt(hostname) },
    { type: 'NS', fn: () => dns.resolveNs(hostname) },
    { type: 'CNAME', fn: () => dns.resolveCname(hostname) },
    { type: 'SOA', fn: () => dns.resolveSoa(hostname) },
  ];

  const results = await Promise.allSettled(queries.map(q => q.fn()));

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const type = queries[i].type.toLowerCase();
      if (type === 'soa') {
        records.soa = r.value;
      } else if (type === 'txt') {
        records.txt = r.value.map(arr => arr.join(''));
      } else if (type === 'mx') {
        records.mx = r.value.map(mx => ({ priority: mx.priority, exchange: mx.exchange }));
      } else {
        records[type] = r.value;
      }
    }
  });

  // Derive info from DNS records
  const emailProvider = deriveEmailProvider(records.mx);
  const dnsProvider = deriveDnsProvider(records.ns);
  const spfRecord = records.txt.find(t => t.startsWith('v=spf1'));
  const dmarcRecord = await getDmarc(hostname);
  const hasVerification = {
    google: records.txt.some(t => t.startsWith('google-site-verification')),
    facebook: records.txt.some(t => t.includes('facebook-domain-verification')),
    microsoft: records.txt.some(t => t.includes('MS=')),
    apple: records.txt.some(t => t.includes('apple-domain-verification')),
  };

  return {
    ...records,
    emailProvider,
    dnsProvider,
    spf: spfRecord || null,
    dmarc: dmarcRecord,
    domainVerifications: hasVerification,
  };
}

function deriveEmailProvider(mxRecords) {
  if (!mxRecords || mxRecords.length === 0) return null;
  const exchanges = mxRecords.map(mx => mx.exchange.toLowerCase());
  if (exchanges.some(e => e.includes('google') || e.includes('gmail'))) return 'Google Workspace';
  if (exchanges.some(e => e.includes('outlook') || e.includes('microsoft'))) return 'Microsoft 365';
  if (exchanges.some(e => e.includes('zoho'))) return 'Zoho Mail';
  if (exchanges.some(e => e.includes('protonmail') || e.includes('proton'))) return 'ProtonMail';
  if (exchanges.some(e => e.includes('mimecast'))) return 'Mimecast';
  if (exchanges.some(e => e.includes('barracuda'))) return 'Barracuda';
  if (exchanges.some(e => e.includes('mailgun'))) return 'Mailgun';
  if (exchanges.some(e => e.includes('sendgrid'))) return 'SendGrid';
  if (exchanges.some(e => e.includes('postmark'))) return 'Postmark';
  if (exchanges.some(e => e.includes('amazon') || e.includes('aws'))) return 'Amazon SES';
  if (exchanges.some(e => e.includes('fastmail'))) return 'Fastmail';
  if (exchanges.some(e => e.includes('icloud'))) return 'iCloud Mail';
  if (exchanges.some(e => e.includes('yandex'))) return 'Yandex Mail';
  return null;
}

function deriveDnsProvider(nsRecords) {
  if (!nsRecords || nsRecords.length === 0) return null;
  const ns = nsRecords.map(n => n.toLowerCase());
  if (ns.some(n => n.includes('cloudflare'))) return 'Cloudflare';
  if (ns.some(n => n.includes('aws') || n.includes('amazon'))) return 'Amazon Route 53';
  if (ns.some(n => n.includes('google'))) return 'Google Cloud DNS';
  if (ns.some(n => n.includes('azure') || n.includes('microsoft'))) return 'Azure DNS';
  if (ns.some(n => n.includes('digitalocean'))) return 'DigitalOcean';
  if (ns.some(n => n.includes('netlify'))) return 'Netlify DNS';
  if (ns.some(n => n.includes('vercel') || n.includes('zeit'))) return 'Vercel DNS';
  if (ns.some(n => n.includes('godaddy') || n.includes('domaincontrol'))) return 'GoDaddy';
  if (ns.some(n => n.includes('namecheap'))) return 'Namecheap';
  if (ns.some(n => n.includes('name.com') || n.includes('name-services'))) return 'Name.com';
  if (ns.some(n => n.includes('hostgator'))) return 'HostGator';
  if (ns.some(n => n.includes('bluehost'))) return 'Bluehost';
  if (ns.some(n => n.includes('linode'))) return 'Linode';
  if (ns.some(n => n.includes('hetzner'))) return 'Hetzner';
  if (ns.some(n => n.includes('ovh'))) return 'OVH';
  return null;
}

async function getDmarc(hostname) {
  try {
    const records = await dns.resolveTxt(`_dmarc.${hostname}`);
    const dmarcRecord = records.flat().find(r => r.startsWith('v=DMARC1'));
    return dmarcRecord || null;
  } catch {
    return null;
  }
}

// ─── SSL Certificate Info ────────────────────────────────────
export async function getSSLInfo(hostname) {
  return new Promise((resolve) => {
    try {
      const options = {
        hostname,
        port: 443,
        method: 'HEAD',
        rejectUnauthorized: false,
        timeout: 10000,
      };

      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate(true);
        if (!cert || !cert.subject) {
          resolve(null);
          return;
        }

        const now = new Date();
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const daysUntilExpiry = Math.round((validTo - now) / (1000 * 60 * 60 * 24));

        resolve({
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysUntilExpiry,
          isExpired: daysUntilExpiry < 0,
          isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry < 30,
          serialNumber: cert.serialNumber,
          fingerprint: cert.fingerprint256 || cert.fingerprint,
          altNames: cert.subjectaltname ? cert.subjectaltname.split(', ').map(n => n.replace('DNS:', '')) : [],
          protocol: res.socket.getProtocol?.() || null,
          cipher: res.socket.getCipher?.() || null,
          isValid: res.socket.authorized,
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    } catch {
      resolve(null);
    }
  });
}

// ─── HTTP Security Deep Analysis ─────────────────────────────
export async function deepSecurityAnalysis(url) {
  const result = {
    httpVersion: null,
    redirectChain: [],
    finalUrl: null,
    cookies: [],
    securityHeaders: {},
    serverInfo: {},
    tls: null,
    cors: null,
    csp: null,
    score: 0,
    grade: 'F',
    findings: [],
  };

  try {
    // Follow redirects manually to capture the chain
    let currentUrl = url;
    const seen = new Set();
    let lastResponse = null;

    for (let i = 0; i < 10; i++) {
      if (seen.has(currentUrl)) break;
      seen.add(currentUrl);

      const resp = await axios.get(currentUrl, {
        timeout: 15000,
        headers: { 'User-Agent': UA },
        maxRedirects: 0,
        validateStatus: () => true,
      });

      result.redirectChain.push({
        url: currentUrl,
        status: resp.status,
        headers: Object.fromEntries(
          Object.entries(resp.headers || {}).filter(([k]) =>
            ['server', 'x-powered-by', 'x-frame-options', 'content-security-policy',
             'strict-transport-security', 'x-content-type-options', 'x-xss-protection',
             'referrer-policy', 'permissions-policy', 'access-control-allow-origin',
             'set-cookie', 'content-type', 'content-encoding', 'cache-control',
             'x-cache', 'x-cdn', 'via', 'alt-svc'].includes(k.toLowerCase())
          )
        ),
      });

      lastResponse = resp;

      // Check for redirect
      if ([301, 302, 303, 307, 308].includes(resp.status) && resp.headers.location) {
        currentUrl = new URL(resp.headers.location, currentUrl).href;
      } else {
        break;
      }
    }

    result.finalUrl = currentUrl;

    // Analyze final response headers
    if (lastResponse) {
      const h = lastResponse.headers;

      // Security headers analysis
      const securityChecks = [
        { header: 'strict-transport-security', name: 'HSTS', weight: 15 },
        { header: 'content-security-policy', name: 'CSP', weight: 15 },
        { header: 'x-frame-options', name: 'X-Frame-Options', weight: 10 },
        { header: 'x-content-type-options', name: 'X-Content-Type-Options', weight: 10 },
        { header: 'referrer-policy', name: 'Referrer-Policy', weight: 10 },
        { header: 'permissions-policy', name: 'Permissions-Policy', weight: 10 },
        { header: 'x-xss-protection', name: 'X-XSS-Protection', weight: 5 },
        { header: 'cross-origin-opener-policy', name: 'COOP', weight: 5 },
        { header: 'cross-origin-resource-policy', name: 'CORP', weight: 5 },
        { header: 'cross-origin-embedder-policy', name: 'COEP', weight: 5 },
      ];

      let score = 0;
      for (const check of securityChecks) {
        const val = h[check.header];
        if (val) {
          score += check.weight;
          result.securityHeaders[check.name] = val;
        } else {
          result.findings.push({
            type: 'missing-header',
            header: check.name,
            severity: check.weight >= 15 ? 'high' : check.weight >= 10 ? 'medium' : 'low',
            recommendation: `Add ${check.name} header for improved security`,
          });
        }
      }

      // HTTPS check
      if (currentUrl.startsWith('https://')) {
        score += 10;
      } else {
        result.findings.push({
          type: 'no-https',
          severity: 'critical',
          recommendation: 'Migrate to HTTPS immediately',
        });
      }

      // Cookies analysis
      const setCookies = h['set-cookie'];
      if (setCookies) {
        const cookieArray = Array.isArray(setCookies) ? setCookies : [setCookies];
        result.cookies = cookieArray.map(c => {
          const parts = c.split(';').map(p => p.trim());
          const [nameVal, ...flags] = parts;
          const [name] = nameVal.split('=');
          const flagSet = flags.map(f => f.toLowerCase());
          return {
            name: name.trim(),
            secure: flagSet.some(f => f === 'secure'),
            httpOnly: flagSet.some(f => f === 'httponly'),
            sameSite: flagSet.find(f => f.startsWith('samesite'))?.split('=')[1] || null,
            path: flagSet.find(f => f.startsWith('path'))?.split('=')[1] || null,
          };
        });

        // Check cookie security
        const insecureCookies = result.cookies.filter(c => !c.secure || !c.httpOnly);
        if (insecureCookies.length > 0) {
          result.findings.push({
            type: 'insecure-cookies',
            count: insecureCookies.length,
            severity: 'medium',
            recommendation: 'Set Secure, HttpOnly, and SameSite flags on all cookies',
          });
        }
      }

      // CSP deep analysis
      const cspHeader = h['content-security-policy'];
      if (cspHeader) {
        const directives = {};
        cspHeader.split(';').forEach(d => {
          const parts = d.trim().split(/\s+/);
          if (parts[0]) directives[parts[0]] = parts.slice(1);
        });
        result.csp = {
          raw: cspHeader.substring(0, 500),
          directives,
          hasUnsafeInline: cspHeader.includes("'unsafe-inline'"),
          hasUnsafeEval: cspHeader.includes("'unsafe-eval'"),
          hasStrictDynamic: cspHeader.includes("'strict-dynamic'"),
        };
        if (result.csp.hasUnsafeInline) {
          result.findings.push({ type: 'csp-unsafe-inline', severity: 'medium', recommendation: 'Remove unsafe-inline from CSP' });
        }
        if (result.csp.hasUnsafeEval) {
          result.findings.push({ type: 'csp-unsafe-eval', severity: 'high', recommendation: 'Remove unsafe-eval from CSP' });
        }
      }

      // Server info
      result.serverInfo = {
        server: h['server'] || null,
        poweredBy: h['x-powered-by'] || null,
        via: h['via'] || null,
        altSvc: h['alt-svc'] || null,
        cache: h['x-cache'] || null,
        cdn: h['x-cdn'] || null,
      };

      result.score = Math.min(100, score);
      result.grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
    }
  } catch (err) {
    result.findings.push({ type: 'error', message: err.message?.substring(0, 200) });
  }

  return result;
}

// ─── Page Fingerprint ────────────────────────────────────────
export function generatePageFingerprint(html) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    contentHash: crypto.createHash('md5').update(stripped).digest('hex'),
    fullHash: crypto.createHash('md5').update(html).digest('hex'),
    contentLength: stripped.length,
    htmlLength: html.length,
  };
}

// ─── Broken Link Checker ─────────────────────────────────────
export async function checkLinks(links, concurrency = 5) {
  const results = [];
  const chunks = [];

  for (let i = 0; i < links.length; i += concurrency) {
    chunks.push(links.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const checks = await Promise.allSettled(
      chunk.map(async (link) => {
        try {
          const resp = await axios.head(link.url, {
            timeout: 10000,
            maxRedirects: 5,
            headers: { 'User-Agent': UA },
            validateStatus: () => true,
          });
          return {
            url: link.url,
            text: link.text,
            status: resp.status,
            ok: resp.status >= 200 && resp.status < 400,
            redirected: resp.request?.res?.responseUrl !== link.url,
            finalUrl: resp.request?.res?.responseUrl || link.url,
          };
        } catch (err) {
          return {
            url: link.url,
            text: link.text,
            status: null,
            ok: false,
            error: err.code || err.message?.substring(0, 100),
          };
        }
      })
    );

    checks.forEach(r => {
      if (r.status === 'fulfilled') results.push(r.value);
    });
  }

  const broken = results.filter(r => !r.ok);
  const redirected = results.filter(r => r.ok && r.redirected);

  return {
    total: results.length,
    ok: results.filter(r => r.ok && !r.redirected).length,
    broken: broken.length,
    redirected: redirected.length,
    brokenLinks: broken.slice(0, 50),
    redirectedLinks: redirected.slice(0, 50),
  };
}

// ─── Full Site Intelligence ──────────────────────────────────
export async function gatherSiteIntelligence(url) {
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname;

  const [sitemapData, robotsData, dnsData, sslData, securityData] = await Promise.allSettled([
    parseSitemap(url),
    parseRobotsTxt(url),
    dnsRecon(hostname),
    getSSLInfo(hostname),
    deepSecurityAnalysis(url),
  ]);

  return {
    sitemap: sitemapData.status === 'fulfilled' ? sitemapData.value : null,
    robots: robotsData.status === 'fulfilled' ? robotsData.value : null,
    dns: dnsData.status === 'fulfilled' ? dnsData.value : null,
    ssl: sslData.status === 'fulfilled' ? sslData.value : null,
    security: securityData.status === 'fulfilled' ? securityData.value : null,
  };
}
