/**
 * Data Extractor Service — Advanced Edition
 * Extracts all structured data, leaked/sensitive data, scripts, comments,
 * security info, and more from parsed HTML using Cheerio
 */
import * as cheerio from 'cheerio';
import { detectTechStack } from './techDetector.js';

/**
 * Extract all data from HTML content
 */
export function extractPageData(html, pageUrl, headers = {}) {
  const $ = cheerio.load(html);
  const baseUrl = new URL(pageUrl);

  return {
    title: extractTitle($),
    metaDescription: extractMetaDescription($),
    headings: extractHeadings($),
    paragraphs: extractParagraphs($),
    linksInternal: extractLinks($, baseUrl, 'internal'),
    linksExternal: extractLinks($, baseUrl, 'external'),
    images: extractImages($, baseUrl),
    emails: extractEmails($, html),
    phones: extractPhones(html),
    socialLinks: extractSocialLinks($, html),
    metadata: extractMetadata($, pageUrl),
    techStack: detectTechStack(html, headers),
    tablesData: extractTables($),
    formsData: extractForms($, baseUrl),
    wordCount: countWords($),
    // ─── NEW: Advanced extractions ───
    scripts: extractScripts($, baseUrl),
    stylesheets: extractStylesheets($, baseUrl),
    comments: extractComments(html),
    leakedData: extractLeakedData($, html),
    securityInfo: extractSecurityInfo(headers, $),
    hiddenFields: extractHiddenFields($),
    iframes: extractIframes($, baseUrl),
    downloads: extractDownloadables($, baseUrl),
    videos: extractVideos($, baseUrl),
  };
}

function extractTitle($) {
  return $('title').first().text().trim() || null;
}

function extractMetaDescription($) {
  return $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() || null;
}

function extractHeadings($) {
  const headings = { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
  for (let i = 1; i <= 6; i++) {
    $(`h${i}`).each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings[`h${i}`].push(text);
    });
  }
  return headings;
}

function extractParagraphs($) {
  const paragraphs = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) {
      paragraphs.push(text);
    }
  });
  return paragraphs.slice(0, 500); // Limit
}

function extractLinks($, baseUrl, type) {
  const links = [];
  const seen = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    let absoluteUrl;
    try {
      absoluteUrl = new URL(href, baseUrl.origin).href;
    } catch {
      return;
    }

    if (seen.has(absoluteUrl)) return;
    seen.add(absoluteUrl);

    const linkUrl = new URL(absoluteUrl);
    const isInternal = linkUrl.hostname === baseUrl.hostname;

    if ((type === 'internal' && isInternal) || (type === 'external' && !isInternal)) {
      links.push({
        url: absoluteUrl,
        text: $(el).text().trim().substring(0, 200) || null,
        domain: linkUrl.hostname,
      });
    }
  });

  return links;
}

function extractImages($, baseUrl) {
  const images = [];
  const seen = new Set();

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (!src) return;

    let absoluteSrc;
    try {
      absoluteSrc = new URL(src, baseUrl.origin).href;
    } catch {
      absoluteSrc = src;
    }

    if (seen.has(absoluteSrc)) return;
    seen.add(absoluteSrc);

    images.push({
      src: absoluteSrc,
      alt: $(el).attr('alt')?.trim() || null,
      width: $(el).attr('width') || null,
      height: $(el).attr('height') || null,
    });
  });

  return images.slice(0, 200);
}

function extractEmails($, html) {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const text = $('body').text() + ' ' + html;
  const matches = text.match(emailRegex) || [];
  return [...new Set(matches)].filter(e =>
    !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif') &&
    !e.endsWith('.svg') && !e.endsWith('.webp') && !e.includes('example.com') &&
    !e.includes('sentry')
  ).slice(0, 100);
}

function extractPhones(html) {
  // Match various phone formats
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  const telRegex = /tel:([^"'\s]+)/g;

  const matches = new Set();

  let m;
  while ((m = telRegex.exec(html)) !== null) {
    matches.add(m[1].replace(/[^0-9+\-() ]/g, '').trim());
  }

  const bodyPhones = html.match(phoneRegex) || [];
  bodyPhones.forEach(p => {
    const cleaned = p.trim();
    if (cleaned.replace(/\D/g, '').length >= 10) {
      matches.add(cleaned);
    }
  });

  return [...matches].slice(0, 50);
}

const SOCIAL_PLATFORMS = [
  { name: 'Twitter/X', patterns: ['twitter.com/', 'x.com/'] },
  { name: 'LinkedIn', patterns: ['linkedin.com/'] },
  { name: 'Facebook', patterns: ['facebook.com/', 'fb.com/'] },
  { name: 'Instagram', patterns: ['instagram.com/'] },
  { name: 'YouTube', patterns: ['youtube.com/', 'youtu.be/'] },
  { name: 'GitHub', patterns: ['github.com/'] },
  { name: 'TikTok', patterns: ['tiktok.com/'] },
  { name: 'Pinterest', patterns: ['pinterest.com/'] },
  { name: 'Reddit', patterns: ['reddit.com/'] },
];

function extractSocialLinks($, html) {
  const socialLinks = [];
  const seen = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    for (const platform of SOCIAL_PLATFORMS) {
      if (platform.patterns.some(p => href.toLowerCase().includes(p))) {
        if (!seen.has(href)) {
          seen.add(href);
          socialLinks.push({
            platform: platform.name,
            url: href,
          });
        }
        break;
      }
    }
  });

  return socialLinks;
}

function extractMetadata($, pageUrl) {
  const meta = {
    title: $('title').first().text().trim() || null,
    description: $('meta[name="description"]').attr('content')?.trim() || null,
    keywords: $('meta[name="keywords"]').attr('content')?.trim() || null,
    robots: $('meta[name="robots"]').attr('content')?.trim() || null,
    viewport: $('meta[name="viewport"]').attr('content')?.trim() || null,
    canonical: $('link[rel="canonical"]').attr('href') || null,
    favicon: null,
    language: $('html').attr('lang') || null,
    openGraph: {},
    twitterCard: {},
    jsonLd: [],
  };

  // Favicon
  const faviconLink = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href');
  if (faviconLink) {
    try {
      meta.favicon = new URL(faviconLink, pageUrl).href;
    } catch {
      meta.favicon = faviconLink;
    }
  }

  // Open Graph
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr('property')?.replace('og:', '');
    const content = $(el).attr('content');
    if (prop && content) meta.openGraph[prop] = content;
  });

  // Twitter Card
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr('name')?.replace('twitter:', '');
    const content = $(el).attr('content');
    if (name && content) meta.twitterCard[name] = content;
  });

  // JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonData = JSON.parse($(el).html());
      meta.jsonLd.push(jsonData);
    } catch {
      // Skip invalid JSON-LD
    }
  });

  return meta;
}

function extractTables($) {
  const tables = [];

  $('table').each((idx, table) => {
    if (idx >= 20) return false; // Limit tables
    const headers = [];
    const rows = [];

    $(table).find('thead th, thead td, tr:first-child th').each((_, th) => {
      headers.push($(th).text().trim());
    });

    $(table).find('tbody tr, tr').each((_, tr) => {
      const row = [];
      $(tr).find('td').each((_, td) => {
        row.push($(td).text().trim());
      });
      if (row.length > 0) rows.push(row);
    });

    if (headers.length > 0 || rows.length > 0) {
      tables.push({ headers, rows: rows.slice(0, 100) });
    }
  });

  return tables;
}

function extractForms($, baseUrl) {
  const forms = [];

  $('form').each((idx, form) => {
    if (idx >= 20) return false;
    const action = $(form).attr('action') || null;
    const method = ($(form).attr('method') || 'GET').toUpperCase();
    const fields = [];

    $(form).find('input, select, textarea').each((_, field) => {
      fields.push({
        tag: field.tagName?.toLowerCase(),
        type: $(field).attr('type') || null,
        name: $(field).attr('name') || null,
        id: $(field).attr('id') || null,
        placeholder: $(field).attr('placeholder') || null,
        required: $(field).attr('required') !== undefined,
      });
    });

    let absoluteAction = action;
    if (action) {
      try {
        absoluteAction = new URL(action, baseUrl.origin).href;
      } catch {
        // keep original
      }
    }

    forms.push({ action: absoluteAction, method, fields });
  });

  return forms;
}

function countWords($) {
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

/* ═══════════════════════════════════════════════════
   ADVANCED EXTRACTION FUNCTIONS
   ═══════════════════════════════════════════════════ */

/**
 * Extract all <script> tags — src, inline content snippets, type
 */
function extractScripts($, baseUrl) {
  const scripts = [];
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    const type = $(el).attr('type') || 'text/javascript';
    const inline = !src ? $(el).html()?.trim().substring(0, 500) : null;

    let absoluteSrc = src;
    if (src) {
      try { absoluteSrc = new URL(src, baseUrl.origin).href; } catch {}
    }

    scripts.push({
      src: absoluteSrc || null,
      type,
      async: $(el).attr('async') !== undefined,
      defer: $(el).attr('defer') !== undefined,
      inline: inline || null,
      size: inline ? inline.length : null,
    });
  });
  return scripts.slice(0, 100);
}

/**
 * Extract all stylesheets — <link rel="stylesheet"> and <style> blocks
 */
function extractStylesheets($, baseUrl) {
  const sheets = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    let absoluteHref = href;
    if (href) {
      try { absoluteHref = new URL(href, baseUrl.origin).href; } catch {}
    }
    sheets.push({ type: 'external', href: absoluteHref, media: $(el).attr('media') || null });
  });

  $('style').each((_, el) => {
    const content = $(el).html()?.trim();
    sheets.push({
      type: 'inline',
      href: null,
      size: content?.length || 0,
      snippet: content?.substring(0, 200) || null,
    });
  });
  return sheets.slice(0, 60);
}

/**
 * Extract HTML comments — can contain dev notes, credentials, TODOs
 */
function extractComments(html) {
  const commentRegex = /<!--([\s\S]*?)-->/g;
  const comments = [];
  let match;
  while ((match = commentRegex.exec(html)) !== null) {
    const text = match[1].trim();
    if (text && text.length > 3 && text.length < 2000) {
      comments.push(text.substring(0, 500));
    }
  }
  return comments.slice(0, 100);
}

/**
 * Extract leaked / sensitive data patterns from page source
 * HIGH ACCURACY VERSION — Only flags items with strong confidence
 * Each finding includes a confidence score and contextual validation
 */
function extractLeakedData($, html) {
  const leaked = {
    apiKeys: [],
    tokens: [],
    passwords: [],
    awsKeys: [],
    privateIPs: [],
    envVars: [],
    jwtTokens: [],
    databaseUrls: [],
    s3Buckets: [],
    debugInfo: [],
    sensitiveComments: [],
    exposedPaths: [],
    configFiles: [],
  };

  const fullText = html;

  // Helper: Check if a match is inside an HTML tag attribute, script src, or common false-positive context
  const isLikelyFalsePositive = (match, text, pos) => {
    // Get surrounding context (100 chars before and after)
    const start = Math.max(0, pos - 100);
    const end = Math.min(text.length, pos + match.length + 100);
    const context = text.substring(start, end).toLowerCase();

    // Skip if inside common benign contexts
    const falseContexts = [
      'font-face', 'font-family', '@keyframes', 'animation',
      'stylesheet', 'text/css', 'placeholder', 'example',
      'test', 'sample', 'demo', 'dummy', 'fake', 'xxx',
      'lorem', 'your-', 'your_', '<option', 'id="', "id='",
      'class="', "class='", 'data-', 'aria-',
    ];
    return falseContexts.some(ctx => context.includes(ctx));
  };

  // ─── API Keys & Secrets (HIGH CONFIDENCE only) ──────
  // These patterns have unique prefixes that are extremely unlikely to appear randomly
  const apiKeyPatterns = [
    { name: 'Google API Key', re: /AIza[0-9A-Za-z\-_]{35}/g, confidence: 'high' },
    { name: 'Google OAuth Client', re: /[0-9]{10,}-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g, confidence: 'high' },
    { name: 'Stripe Live Secret', re: /sk_live_[0-9a-zA-Z]{24,}/g, confidence: 'high' },
    { name: 'Stripe Live Publishable', re: /pk_live_[0-9a-zA-Z]{24,}/g, confidence: 'high' },
    { name: 'Stripe Test Secret', re: /sk_test_[0-9a-zA-Z]{24,}/g, confidence: 'medium' },
    { name: 'Slack Webhook URL', re: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]{20,}/g, confidence: 'high' },
    { name: 'Slack Bot Token', re: /xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24}/g, confidence: 'high' },
    { name: 'GitHub Personal Token', re: /ghp_[0-9A-Za-z]{36}/g, confidence: 'high' },
    { name: 'GitHub OAuth Token', re: /gho_[0-9A-Za-z]{36}/g, confidence: 'high' },
    { name: 'GitHub App Token', re: /ghu_[0-9A-Za-z]{36}/g, confidence: 'high' },
    { name: 'SendGrid API Key', re: /SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43}/g, confidence: 'high' },
    { name: 'Mailgun API Key', re: /key-[0-9a-f]{32}/g, confidence: 'medium' },
    { name: 'Firebase Cloud Messaging', re: /AAAA[a-zA-Z0-9_\-]{7}:[a-zA-Z0-9_\-]{140}/g, confidence: 'high' },
    { name: 'Twilio Account SID', re: /AC[0-9a-f]{32}/g, confidence: 'high' },
    { name: 'Shopify Access Token', re: /shpat_[a-fA-F0-9]{32}/g, confidence: 'high' },
    { name: 'Shopify Shared Secret', re: /shpss_[a-fA-F0-9]{32}/g, confidence: 'high' },
    { name: 'npm Token', re: /npm_[A-Za-z0-9]{36}/g, confidence: 'high' },
    { name: 'Discord Bot Token', re: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g, confidence: 'medium' },
  ];

  for (const pat of apiKeyPatterns) {
    let match;
    const re = new RegExp(pat.re.source, pat.re.flags);
    while ((match = re.exec(fullText)) !== null) {
      // Validate it's not in a false-positive context
      if (!isLikelyFalsePositive(match[0], fullText, match.index)) {
        leaked.apiKeys.push({
          type: pat.name,
          value: match[0].substring(0, 12) + '...' + match[0].substring(match[0].length - 4),
          confidence: pat.confidence,
        });
      }
    }
  }

  // ─── AWS Keys (very specific prefixes) ──────
  const awsAccessKey = fullText.match(/(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])/g);
  if (awsAccessKey) {
    awsAccessKey.forEach(k => {
      leaked.awsKeys.push({ type: 'AWS Access Key ID', value: k.substring(0, 8) + '...' + k.substring(16), confidence: 'high' });
    });
  }

  const awsSecretRe = /(?:aws_secret_access_key|aws_secret)\s*[:=]\s*['"]([A-Za-z0-9\/+=]{40})['"]/gi;
  let awsM;
  while ((awsM = awsSecretRe.exec(fullText)) !== null) {
    leaked.awsKeys.push({ type: 'AWS Secret Access Key', value: awsM[1].substring(0, 8) + '...', confidence: 'high' });
  }

  // ─── JWT Tokens (must have valid base64url segments) ──────
  const jwtRegex = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
  let jwtM;
  while ((jwtM = jwtRegex.exec(fullText)) !== null) {
    const token = jwtM[0];
    // Validate: try to decode header to check it's a real JWT
    try {
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
      if (header.alg || header.typ) {
        leaked.jwtTokens.push({
          value: token.substring(0, 20) + '...',
          header: header,
          confidence: 'high',
        });
      }
    } catch {
      // Not a valid JWT, skip
    }
  }

  // ─── Passwords (only in assignment contexts with actual values) ──────
  const passRe = /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{4,50})['"]/gi;
  let passM;
  while ((passM = passRe.exec(fullText)) !== null) {
    const val = passM[1];
    // Skip common non-password values
    const skipValues = ['password', 'pass', 'true', 'false', 'null', 'none',
      'show', 'hide', 'toggle', 'text', 'hidden', 'visible', 'required',
      'optional', 'enter', 'type', 'input', 'field', 'form', 'your',
      'change', 'reset', 'forgot', 'new', 'confirm', 'current', 'old',
      'min', 'max', 'pattern', '*', '•', '●', '********'];
    if (skipValues.some(sv => val.toLowerCase() === sv || val.toLowerCase().startsWith(sv + ' '))) {
      continue;
    }
    if (!isLikelyFalsePositive(passM[0], fullText, passM.index)) {
      leaked.passwords.push({
        value: passM[0].substring(0, 40) + (passM[0].length > 40 ? '...' : ''),
        confidence: 'medium',
      });
    }
  }

  // ─── Database URLs (very specific protocol prefixes) ──────
  const dbUrlRegex = /(?:mongodb(?:\+srv)?|mysql|postgresql|postgres|redis|amqp|mssql):\/\/[^\s'"<>]{10,200}/gi;
  const dbUrls = fullText.match(dbUrlRegex);
  if (dbUrls) {
    leaked.databaseUrls = [...new Set(dbUrls)].map(u => ({
      value: u.substring(0, 30) + '...',
      protocol: u.split('://')[0],
      confidence: 'high',
    }));
  }

  // ─── S3 Buckets ──────────────────────────────
  const s3Regex = /(?:https?:\/\/)?[a-z0-9][a-z0-9\-]{2,62}\.s3[.\-](?:us|eu|ap|sa|ca|me|af)[a-z0-9\-]*\.amazonaws\.com/gi;
  const s3alt = /s3:\/\/[a-z0-9][a-z0-9.\-]{2,62}/gi;
  const s3Matches = [...(fullText.match(s3Regex) || []), ...(fullText.match(s3alt) || [])];
  if (s3Matches.length) {
    leaked.s3Buckets = [...new Set(s3Matches)].slice(0, 10).map(b => ({
      value: b,
      confidence: 'high',
    }));
  }

  // ─── Environment variable references in client-side code ──────
  // Only in <script> tags, not in general HTML
  const scriptContent = [];
  $('script:not([src])').each((_, el) => {
    const content = $(el).html();
    if (content) scriptContent.push(content);
  });
  const scriptText = scriptContent.join('\n');

  const envRegex = /process\.env\.([A-Z_][A-Z0-9_]{2,})/g;
  let envM;
  while ((envM = envRegex.exec(scriptText)) !== null) {
    leaked.envVars.push(envM[1]);
  }
  leaked.envVars = [...new Set(leaked.envVars)].slice(0, 30);

  // ─── Sensitive HTML comments (only truly suspicious ones) ──────
  const commentRegex = /<!--([\s\S]*?)-->/g;
  let commentM;
  while ((commentM = commentRegex.exec(fullText)) !== null) {
    const text = commentM[1].trim();
    if (text.length < 5 || text.length > 500) continue;
    // Only flag comments containing actual credential-like patterns
    const sensitiveRe = /(?:password|passwd|secret|token|api[_\-]?key|credential|private[_\-]?key)\s*[:=]/i;
    if (sensitiveRe.test(text)) {
      leaked.sensitiveComments.push({
        value: text.substring(0, 150),
        confidence: 'medium',
      });
    }
  }

  // ─── Exposed server paths (only in suspicious contexts) ──────
  const serverPathRe = /(?:\/etc\/(?:passwd|shadow))/g;
  const serverPaths = fullText.match(serverPathRe);
  if (serverPaths) {
    leaked.exposedPaths = [...new Set(serverPaths)].map(p => ({
      value: p,
      confidence: 'high',
    }));
  }

  // ─── Calculate severity (based on high-confidence findings) ──────
  const highConfidence = [
    ...leaked.apiKeys.filter(k => k.confidence === 'high'),
    ...leaked.awsKeys,
    ...leaked.databaseUrls,
    ...leaked.jwtTokens.filter(t => t.confidence === 'high'),
  ].length;

  const mediumConfidence = [
    ...leaked.apiKeys.filter(k => k.confidence === 'medium'),
    ...leaked.passwords,
    ...leaked.sensitiveComments,
  ].length;

  const totalFindings = highConfidence + mediumConfidence + leaked.s3Buckets.length;

  leaked.severity = totalFindings === 0 ? 'clean'
    : highConfidence > 0 ? 'high'
    : totalFindings < 3 ? 'low'
    : 'medium';
  leaked.totalFindings = totalFindings;

  return leaked;
}

/**
 * Extract security-relevant headers and meta info
 */
function extractSecurityInfo(headers, $) {
  const info = {
    headers: {},
    csp: null,
    hsts: null,
    xFrameOptions: null,
    xContentType: null,
    xXssProtection: null,
    referrerPolicy: null,
    permissionsPolicy: null,
    cors: null,
    certificate: null,
    missingHeaders: [],
    score: 0,
  };

  // Check important security headers
  const secHeaders = {
    'content-security-policy': 'CSP',
    'strict-transport-security': 'HSTS',
    'x-frame-options': 'X-Frame-Options',
    'x-content-type-options': 'X-Content-Type-Options',
    'x-xss-protection': 'X-XSS-Protection',
    'referrer-policy': 'Referrer-Policy',
    'permissions-policy': 'Permissions-Policy',
    'access-control-allow-origin': 'CORS',
  };

  let score = 0;
  for (const [header, label] of Object.entries(secHeaders)) {
    const val = headers[header] || headers[header.toLowerCase()];
    if (val) {
      info.headers[label] = val;
      score += 12.5;
    } else {
      info.missingHeaders.push(label);
    }
  }
  info.score = Math.round(score);

  // CSP from meta tag
  const cspMeta = $('meta[http-equiv="Content-Security-Policy"]').attr('content');
  if (cspMeta) {
    info.headers['CSP (meta)'] = cspMeta;
    if (!info.headers['CSP']) score += 12.5;
  }

  info.score = Math.round(score);
  return info;
}

/**
 * Extract hidden form fields (often contain CSRF tokens, session IDs)
 */
function extractHiddenFields($) {
  const hidden = [];
  $('input[type="hidden"]').each((_, el) => {
    hidden.push({
      name: $(el).attr('name') || null,
      value: $(el).attr('value')?.substring(0, 200) || null,
      id: $(el).attr('id') || null,
    });
  });
  return hidden.slice(0, 50);
}

/**
 * Extract all iframes
 */
function extractIframes($, baseUrl) {
  const iframes = [];
  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    let absoluteSrc = src;
    if (src) {
      try { absoluteSrc = new URL(src, baseUrl.origin).href; } catch {}
    }
    iframes.push({
      src: absoluteSrc || null,
      title: $(el).attr('title') || null,
      width: $(el).attr('width') || null,
      height: $(el).attr('height') || null,
      sandbox: $(el).attr('sandbox') || null,
    });
  });
  return iframes.slice(0, 30);
}

/**
 * Extract downloadable file links (.pdf, .doc, .zip, etc.)
 */
function extractDownloadables($, baseUrl) {
  const extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.tar', '.gz', '.csv', '.txt', '.rtf', '.odt'];
  const files = [];
  const seen = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const lower = href.toLowerCase();
    if (extensions.some(ext => lower.endsWith(ext) || lower.includes(ext + '?'))) {
      let absoluteUrl;
      try { absoluteUrl = new URL(href, baseUrl.origin).href; } catch { absoluteUrl = href; }
      if (seen.has(absoluteUrl)) return;
      seen.add(absoluteUrl);
      const ext = lower.match(/\.([a-z0-9]{2,5})(?:\?|$)/)?.[1] || 'unknown';
      files.push({
        url: absoluteUrl,
        text: $(el).text().trim().substring(0, 100) || null,
        extension: ext,
      });
    }
  });
  return files.slice(0, 50);
}

/**
 * Extract video elements
 */
function extractVideos($, baseUrl) {
  const videos = [];
  $('video, video source').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (!src) return;
    let absoluteSrc = src;
    try { absoluteSrc = new URL(src, baseUrl.origin).href; } catch {}
    videos.push({
      src: absoluteSrc,
      type: $(el).attr('type') || null,
      poster: $(el).parent('video').attr('poster') || $(el).attr('poster') || null,
    });
  });
  return videos.slice(0, 30);
}
