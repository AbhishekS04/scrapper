/**
 * Security Audit Service
 * Deep security analysis: mixed content, CORS, SRI, WAF detection,
 * rate limiting, CSP analysis, header hardening audit
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

// ─── 1. Mixed Content Detection ───

function detectMixedContent(html, baseUrl) {
  const isHTTPS = baseUrl.startsWith('https://');
  if (!isHTTPS) return { applicable: false, reason: 'Site not served over HTTPS' };

  const $ = cheerio.load(html);
  const mixed = {
    active: [],   // scripts, stylesheets, iframes, XHR — can be exploited (blocking)
    passive: [],  // images, audio, video — can be eavesdropped (non-blocking)
    total: 0,
  };

  // Active mixed content
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src?.startsWith('http://')) {
      mixed.active.push({ type: 'script', url: src.substring(0, 300) });
    }
  });
  $('link[rel="stylesheet"][href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href?.startsWith('http://')) {
      mixed.active.push({ type: 'stylesheet', url: href.substring(0, 300) });
    }
  });
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src?.startsWith('http://')) {
      mixed.active.push({ type: 'iframe', url: src.substring(0, 300) });
    }
  });
  $('object[data], embed[src]').each((_, el) => {
    const src = $(el).attr('data') || $(el).attr('src');
    if (src?.startsWith('http://')) {
      mixed.active.push({ type: 'plugin', url: src.substring(0, 300) });
    }
  });

  // Passive mixed content
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src?.startsWith('http://')) {
      mixed.passive.push({ type: 'image', url: src.substring(0, 300) });
    }
  });
  $('audio[src], video[src], source[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src?.startsWith('http://')) {
      mixed.passive.push({ type: 'media', url: src.substring(0, 300) });
    }
  });

  // Form actions
  $('form[action]').each((_, el) => {
    const action = $(el).attr('action');
    if (action?.startsWith('http://')) {
      mixed.active.push({ type: 'form-action', url: action.substring(0, 300) });
    }
  });

  mixed.total = mixed.active.length + mixed.passive.length;
  mixed.applicable = true;
  mixed.severity = mixed.active.length > 0 ? 'HIGH' : mixed.passive.length > 0 ? 'MEDIUM' : 'NONE';

  return mixed;
}

// ─── 2. CORS Policy Analysis ───

async function analyzeCORS(baseUrl) {
  const origins = [
    'https://evil.com',
    'https://attacker.example.com',
    'null',
  ];

  const results = {
    allowsWildcard: false,
    reflectsOrigin: false,
    allowsNull: false,
    allowsCredentials: false,
    exposedHeaders: [],
    allowedMethods: [],
    details: [],
  };

  for (const origin of origins) {
    try {
      const resp = await axios.get(baseUrl, {
        headers: { Origin: origin },
        timeout: 8000,
        validateStatus: () => true,
      });

      const acao = resp.headers['access-control-allow-origin'];
      const acac = resp.headers['access-control-allow-credentials'];
      const acam = resp.headers['access-control-allow-methods'];
      const aceh = resp.headers['access-control-expose-headers'];

      if (acao === '*') results.allowsWildcard = true;
      if (acao === origin) results.reflectsOrigin = true;
      if (origin === 'null' && acao === 'null') results.allowsNull = true;
      if (acac === 'true') results.allowsCredentials = true;
      if (aceh) results.exposedHeaders = aceh.split(',').map(h => h.trim());
      if (acam) results.allowedMethods = acam.split(',').map(m => m.trim());

      results.details.push({
        testedOrigin: origin,
        allowOrigin: acao || null,
        allowCredentials: acac || null,
      });
    } catch {}
  }

  // Test preflight
  try {
    const resp = await axios({
      method: 'OPTIONS',
      url: baseUrl,
      headers: { Origin: 'https://evil.com', 'Access-Control-Request-Method': 'PUT' },
      timeout: 8000,
      validateStatus: () => true,
    });
    results.preflightStatus = resp.status;
    results.preflightHeaders = {
      allowOrigin: resp.headers['access-control-allow-origin'] || null,
      allowMethods: resp.headers['access-control-allow-methods'] || null,
      allowHeaders: resp.headers['access-control-allow-headers'] || null,
      maxAge: resp.headers['access-control-max-age'] || null,
    };
  } catch {}

  results.severity = (results.reflectsOrigin && results.allowsCredentials) ? 'CRITICAL'
    : results.allowsNull ? 'HIGH'
    : results.allowsWildcard ? 'MEDIUM'
    : 'LOW';

  return results;
}

// ─── 3. Subresource Integrity (SRI) Check ───

function checkSRI(html) {
  const $ = cheerio.load(html);
  const resources = [];
  let withSRI = 0;
  let withoutSRI = 0;

  $('script[src], link[rel="stylesheet"][href]').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || $el.attr('href') || '';
    const integrity = $el.attr('integrity') || null;
    const crossorigin = $el.attr('crossorigin') || null;
    const isExternal = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//');

    const resource = {
      type: el.tagName === 'script' ? 'script' : 'stylesheet',
      url: src.substring(0, 300),
      isExternal,
      hasIntegrity: !!integrity,
      integrity: integrity?.substring(0, 100) || null,
      crossorigin,
    };

    if (isExternal) {
      if (integrity) withSRI++;
      else withoutSRI++;
    }

    resources.push(resource);
  });

  const externalCount = withSRI + withoutSRI;

  return {
    totalResources: resources.length,
    externalResources: externalCount,
    withSRI,
    withoutSRI,
    coverage: externalCount > 0 ? Number(((withSRI / externalCount) * 100).toFixed(1)) : 100,
    details: resources.filter(r => r.isExternal).slice(0, 50),
    severity: withoutSRI > 5 ? 'HIGH' : withoutSRI > 0 ? 'MEDIUM' : 'NONE',
  };
}

// ─── 4. WAF / Firewall Detection ───

async function detectWAF(baseUrl) {
  const wafs = {
    cloudflare: { headers: ['cf-ray', 'cf-cache-status', 'cf-request-id'], server: 'cloudflare' },
    akamai: { headers: ['x-akamai-transformed'], server: 'akamaighost' },
    sucuri: { headers: ['x-sucuri-id', 'x-sucuri-cache'], server: 'sucuri' },
    incapsula: { headers: ['x-cdn', 'x-iinfo'], server: '' },
    awsWaf: { headers: ['x-amzn-requestid', 'x-amz-cf-id'], server: '' },
    stackpath: { headers: ['x-sp-url', 'x-sp-wl'], server: '' },
    barracuda: { headers: ['barra_counter_session'], server: '' },
    f5BigIP: { headers: [], server: 'bigip' },
    fortiweb: { headers: ['fortiwafsid'], server: '' },
    imperva: { headers: ['x-cdn'], server: '' },
    wordfence: { headers: [], server: '' },
  };

  const detected = [];

  try {
    // Normal request
    const resp = await axios.get(baseUrl, { timeout: 10000, validateStatus: () => true });
    const headers = resp.headers;
    const serverHeader = (headers['server'] || '').toLowerCase();

    for (const [waf, config] of Object.entries(wafs)) {
      const headerMatch = config.headers.some(h => headers[h]);
      const serverMatch = config.server && serverHeader.includes(config.server);
      if (headerMatch || serverMatch) {
        detected.push({
          name: waf,
          confidence: 'high',
          evidence: headerMatch ? `Header: ${config.headers.find(h => headers[h])}` : `Server: ${serverHeader}`,
        });
      }
    }

    // Test with malicious payload to trigger WAF
    try {
      const evilUrl = new URL(baseUrl);
      evilUrl.searchParams.set('test', '<script>alert(1)</script>');
      const evilResp = await axios.get(evilUrl.toString(), { timeout: 8000, validateStatus: () => true });
      if (evilResp.status === 403 || evilResp.status === 406 || evilResp.status === 418) {
        detected.push({
          name: 'unknown-waf',
          confidence: 'medium',
          evidence: `Blocked XSS test with ${evilResp.status}`,
        });
      }
    } catch {}

    // Check for Wordfence (WordPress)
    const body = typeof resp.data === 'string' ? resp.data : '';
    if (body.includes('wordfence') || body.includes('wfConfig')) {
      detected.push({ name: 'wordfence', confidence: 'high', evidence: 'Found in page source' });
    }

    return {
      detected,
      hasWAF: detected.length > 0,
      serverHeader: headers['server'] || null,
      poweredBy: headers['x-powered-by'] || null,
    };

  } catch (err) {
    return { detected: [], hasWAF: false, error: err.message?.substring(0, 100) };
  }
}

// ─── 5. Rate Limiting Detection ───

async function detectRateLimiting(baseUrl) {
  const results = {
    detected: false,
    headers: {},
    status429: false,
    retryAfter: null,
    rateLimitHeaders: {},
  };

  try {
    const resp = await axios.get(baseUrl, { timeout: 8000, validateStatus: () => true });
    const headers = resp.headers;

    // Standard rate limit headers
    const rlHeaders = [
      'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset',
      'x-rate-limit-limit', 'x-rate-limit-remaining', 'x-rate-limit-reset',
      'ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset', 'ratelimit-policy',
      'retry-after', 'x-retry-after',
    ];

    for (const h of rlHeaders) {
      if (headers[h]) {
        results.rateLimitHeaders[h] = headers[h];
        results.detected = true;
      }
    }

    if (resp.status === 429) {
      results.status429 = true;
      results.detected = true;
      results.retryAfter = headers['retry-after'] || null;
    }

  } catch {}

  return results;
}

// ─── 6. CSP Analysis ───

function analyzeCSP(headers) {
  const csp = headers['content-security-policy'] || headers['content-security-policy-report-only'] || '';
  if (!csp) return { hasCSP: false, severity: 'HIGH', reason: 'No Content-Security-Policy header found' };

  const isReportOnly = !headers['content-security-policy'] && !!headers['content-security-policy-report-only'];
  const directives = {};
  const issues = [];

  csp.split(';').forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const [directive, ...values] = trimmed.split(/\s+/);
    directives[directive] = values;
  });

  // Check for unsafe directives
  if (!directives['default-src']) issues.push('Missing default-src fallback');
  if (!directives['script-src'] && !directives['default-src']) issues.push('Missing script-src directive');

  for (const [dir, vals] of Object.entries(directives)) {
    if (vals.includes("'unsafe-inline'")) issues.push(`${dir} allows 'unsafe-inline'`);
    if (vals.includes("'unsafe-eval'")) issues.push(`${dir} allows 'unsafe-eval'`);
    if (vals.includes('*')) issues.push(`${dir} allows wildcard (*)`);
    if (vals.includes('data:')) issues.push(`${dir} allows data: URIs`);
    if (vals.includes('blob:')) issues.push(`${dir} allows blob: URIs`);

    // Check for overly broad domains
    const broadDomains = vals.filter(v => v.startsWith('*.'));
    if (broadDomains.length > 0) {
      issues.push(`${dir} has broad wildcard domains: ${broadDomains.join(', ')}`);
    }
  }

  // Missing important directives
  const recommended = ['script-src', 'style-src', 'img-src', 'font-src', 'connect-src', 'frame-src', 'base-uri', 'form-action'];
  const missing = recommended.filter(d => !directives[d]);

  return {
    hasCSP: true,
    isReportOnly,
    raw: csp.substring(0, 2000),
    directives,
    issues,
    missingDirectives: missing,
    severity: issues.length > 3 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'LOW',
    score: Math.max(0, 100 - issues.length * 10 - missing.length * 5),
  };
}

// ─── 7. Security Headers Audit ───

function auditSecurityHeaders(headers) {
  const checks = [
    {
      header: 'strict-transport-security',
      name: 'HSTS',
      severity: 'HIGH',
      recommendation: 'Add Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    },
    {
      header: 'x-content-type-options',
      name: 'X-Content-Type-Options',
      severity: 'MEDIUM',
      expectedValue: 'nosniff',
      recommendation: 'Add X-Content-Type-Options: nosniff',
    },
    {
      header: 'x-frame-options',
      name: 'X-Frame-Options',
      severity: 'MEDIUM',
      recommendation: 'Add X-Frame-Options: DENY or SAMEORIGIN',
    },
    {
      header: 'x-xss-protection',
      name: 'X-XSS-Protection',
      severity: 'LOW',
      recommendation: 'Add X-XSS-Protection: 1; mode=block',
    },
    {
      header: 'referrer-policy',
      name: 'Referrer-Policy',
      severity: 'LOW',
      recommendation: 'Add Referrer-Policy: strict-origin-when-cross-origin',
    },
    {
      header: 'permissions-policy',
      name: 'Permissions-Policy',
      severity: 'LOW',
      recommendation: 'Add Permissions-Policy to restrict browser features',
    },
    {
      header: 'cross-origin-opener-policy',
      name: 'COOP',
      severity: 'LOW',
      recommendation: 'Add Cross-Origin-Opener-Policy: same-origin',
    },
    {
      header: 'cross-origin-embedder-policy',
      name: 'COEP',
      severity: 'LOW',
      recommendation: 'Add Cross-Origin-Embedder-Policy: require-corp',
    },
    {
      header: 'cross-origin-resource-policy',
      name: 'CORP',
      severity: 'LOW',
      recommendation: 'Add Cross-Origin-Resource-Policy: same-origin',
    },
  ];

  const results = [];
  let passed = 0;

  for (const check of checks) {
    const value = headers[check.header] || null;
    const present = !!value;
    if (present) passed++;

    results.push({
      header: check.header,
      name: check.name,
      present,
      value: value?.substring(0, 300) || null,
      severity: present ? 'NONE' : check.severity,
      recommendation: present ? null : check.recommendation,
    });
  }

  // Dangerous headers that should be removed
  const dangerousHeaders = [];
  if (headers['server']) dangerousHeaders.push({ header: 'Server', value: headers['server'], reason: 'Reveals server software' });
  if (headers['x-powered-by']) dangerousHeaders.push({ header: 'X-Powered-By', value: headers['x-powered-by'], reason: 'Reveals technology stack' });
  if (headers['x-aspnet-version']) dangerousHeaders.push({ header: 'X-AspNet-Version', value: headers['x-aspnet-version'], reason: 'Reveals ASP.NET version' });
  if (headers['x-aspnetmvc-version']) dangerousHeaders.push({ header: 'X-AspNetMvc-Version', value: headers['x-aspnetmvc-version'], reason: 'Reveals MVC version' });

  return {
    results,
    passed,
    total: checks.length,
    score: Number(((passed / checks.length) * 100).toFixed(1)),
    dangerousHeaders,
    grade: passed >= 8 ? 'A' : passed >= 6 ? 'B' : passed >= 4 ? 'C' : passed >= 2 ? 'D' : 'F',
  };
}

// ─── 8. Cookie Security Analysis ───

function analyzeCookieSecurity(headers) {
  const setCookieHeaders = [];
  const raw = headers['set-cookie'];
  if (raw) {
    if (Array.isArray(raw)) setCookieHeaders.push(...raw);
    else setCookieHeaders.push(raw);
  }

  if (setCookieHeaders.length === 0) return { cookies: [], issues: [], total: 0 };

  const cookies = [];
  const issues = [];

  for (const cookie of setCookieHeaders) {
    const parts = cookie.split(';').map(p => p.trim());
    const [nameValue, ...attrs] = parts;
    const [name] = nameValue.split('=');

    const flags = {};
    for (const attr of attrs) {
      const lower = attr.toLowerCase();
      if (lower === 'secure') flags.secure = true;
      else if (lower === 'httponly') flags.httpOnly = true;
      else if (lower.startsWith('samesite=')) flags.sameSite = attr.split('=')[1];
      else if (lower.startsWith('domain=')) flags.domain = attr.split('=')[1];
      else if (lower.startsWith('path=')) flags.path = attr.split('=')[1];
      else if (lower.startsWith('max-age=')) flags.maxAge = attr.split('=')[1];
      else if (lower.startsWith('expires=')) flags.expires = attr.split('=')[1];
    }

    const cookieIssues = [];
    if (!flags.secure) cookieIssues.push('Missing Secure flag');
    if (!flags.httpOnly) cookieIssues.push('Missing HttpOnly flag');
    if (!flags.sameSite) cookieIssues.push('Missing SameSite attribute');
    else if (flags.sameSite.toLowerCase() === 'none' && !flags.secure) {
      cookieIssues.push('SameSite=None without Secure flag');
    }

    // Session cookies with sensitive-looking names
    const isSensitive = /session|token|auth|jwt|csrf|xsrf/i.test(name);
    if (isSensitive && !flags.httpOnly) {
      cookieIssues.push('Sensitive cookie without HttpOnly');
    }

    cookies.push({ name, flags, issues: cookieIssues, isSensitive });
    issues.push(...cookieIssues.map(i => `${name}: ${i}`));
  }

  return {
    total: cookies.length,
    cookies,
    issues,
    severity: issues.length > 3 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'NONE',
  };
}

// ─── Main Export ───

export async function runSecurityAudit(html, url, headers = {}, onProgress) {
  if (onProgress) onProgress('Running security audit...');

  const [cors, waf, rateLimit] = await Promise.allSettled([
    analyzeCORS(url),
    detectWAF(url),
    detectRateLimiting(url),
  ]);

  const result = {
    mixedContent: detectMixedContent(html, url),
    cors: cors.status === 'fulfilled' ? cors.value : { error: cors.reason?.message },
    sri: checkSRI(html),
    waf: waf.status === 'fulfilled' ? waf.value : { error: waf.reason?.message },
    rateLimiting: rateLimit.status === 'fulfilled' ? rateLimit.value : { error: rateLimit.reason?.message },
    csp: analyzeCSP(headers),
    securityHeaders: auditSecurityHeaders(headers),
    cookieSecurity: analyzeCookieSecurity(headers),
  };

  // Overall security score
  const mixedSeverity = result.mixedContent.severity || (result.mixedContent.applicable === false ? 'NONE' : 'HIGH');
  const cookieSeverity = result.cookieSecurity.severity || (result.cookieSecurity.total === 0 ? 'NONE' : 'HIGH');
  const scores = [
    mixedSeverity === 'NONE' ? 100 : mixedSeverity === 'MEDIUM' ? 60 : 20,
    result.sri.coverage || 0,
    result.csp.hasCSP ? (result.csp.score ?? 50) : 0,
    result.securityHeaders.score || 0,
    cookieSeverity === 'NONE' ? 100 : cookieSeverity === 'MEDIUM' ? 60 : 20,
  ];
  result.overallScore = Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1));
  result.overallGrade = result.overallScore >= 80 ? 'A' : result.overallScore >= 60 ? 'B' : result.overallScore >= 40 ? 'C' : result.overallScore >= 20 ? 'D' : 'F';

  if (onProgress) onProgress('Security audit complete');
  return result;
}
