/**
 * CMS Detector & Deep Scanner
 * WordPress deep scan, CMS version fingerprinting,
 * plugin/theme enumeration, and CMS-specific vulnerability checks
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT = 8000;

const ax = axios.create({
  timeout: TIMEOUT,
  headers: { 'User-Agent': UA },
  maxRedirects: 5,
  validateStatus: () => true,
});

// ─── CMS Signatures ───

const CMS_SIGNATURES = {
  wordpress: {
    meta: [/name="generator"\s+content="WordPress\s*([\d.]*)/i],
    paths: ['/wp-login.php', '/wp-admin/', '/wp-content/', '/wp-includes/'],
    html: [/wp-content/i, /wp-includes/i, /wp-json/i, /wordpress/i],
    headers: { 'x-powered-by': /wordpress/i, 'link': /wp-json/i },
  },
  drupal: {
    meta: [/name="generator"\s+content="Drupal\s*([\d.]*)/i],
    paths: ['/core/misc/drupal.js', '/sites/default/', '/misc/drupal.js'],
    html: [/Drupal\.settings/i, /drupal\.js/i, /sites\/all/i],
    headers: { 'x-generator': /drupal/i, 'x-drupal-cache': /.+/ },
  },
  joomla: {
    meta: [/name="generator"\s+content="Joomla/i],
    paths: ['/administrator/', '/components/', '/templates/system/'],
    html: [/\/media\/jui/i, /joomla/i, /option=com_/i],
    headers: {},
  },
  shopify: {
    meta: [],
    paths: [],
    html: [/cdn\.shopify\.com/i, /Shopify\.theme/i, /shopify-section/i],
    headers: { 'x-shopid': /.+/, 'x-shardid': /.+/ },
  },
  wix: {
    meta: [/name="generator"\s+content="Wix/i],
    paths: [],
    html: [/wix\.com/i, /X-Wix-/i, /static\.parastorage\.com/i],
    headers: { 'x-wix-request-id': /.+/ },
  },
  squarespace: {
    meta: [/name="generator"\s+content="Squarespace/i],
    paths: [],
    html: [/squarespace/i, /sqsp/i, /static\.squarespace\.com/i],
    headers: { 'x-servedby': /squarespace/i },
  },
  ghost: {
    meta: [/name="generator"\s+content="Ghost\s*([\d.]*)/i],
    paths: ['/ghost/'],
    html: [/ghost-/i, /content\/images/i, /ghost\.org/i],
    headers: { 'x-ghost-cache-status': /.+/ },
  },
  magento: {
    meta: [],
    paths: ['/skin/frontend/', '/js/mage/', '/errors/default/'],
    html: [/Mage\.Cookies/i, /\/skin\/frontend/i, /magento/i, /varien/i],
    headers: { 'x-magento-vary': /.+/ },
  },
  laravel: {
    meta: [],
    paths: [],
    html: [/laravel/i],
    headers: { 'set-cookie': /laravel_session/i, 'x-powered-by': /laravel/i },
  },
  nextjs: {
    meta: [],
    paths: ['/_next/'],
    html: [/__next/i, /_next\/static/i, /next\/router/i, /__NEXT_DATA__/i],
    headers: { 'x-powered-by': /next\.js/i, 'x-nextjs-cache': /.+/ },
  },
  nuxtjs: {
    meta: [],
    paths: ['/_nuxt/'],
    html: [/__nuxt/i, /_nuxt\//i, /nuxtjs/i],
    headers: {},
  },
  gatsby: {
    meta: [/name="generator"\s+content="Gatsby/i],
    paths: [],
    html: [/gatsby/i, /___gatsby/i, /__gatsby/i],
    headers: { 'x-powered-by': /gatsby/i },
  },
  hugo: {
    meta: [/name="generator"\s+content="Hugo\s*([\d.]*)/i],
    paths: [],
    html: [],
    headers: {},
  },
  webflow: {
    meta: [/name="generator"\s+content="Webflow/i],
    paths: [],
    html: [/webflow/i, /wf-/i],
    headers: {},
  },
  contentful: {
    meta: [],
    paths: [],
    html: [/contentful/i, /ctfassets/i],
    headers: {},
  },
  strapi: {
    meta: [],
    paths: ['/admin/', '/_health'],
    html: [],
    headers: { 'x-powered-by': /strapi/i },
  },
};

// ─── 1. CMS Detection ───

function detectCMS(html, headers) {
  const detected = [];
  const lowerHtml = html.toLowerCase();

  for (const [cms, sig] of Object.entries(CMS_SIGNATURES)) {
    let confidence = 0;
    const evidence = [];
    let version = null;

    // Check meta generator tags
    for (const pattern of sig.meta) {
      const match = html.match(pattern);
      if (match) {
        confidence += 40;
        evidence.push('Meta generator tag');
        if (match[1]) version = match[1];
      }
    }

    // Check HTML patterns
    for (const pattern of sig.html) {
      if (pattern.test(html)) {
        confidence += 20;
        evidence.push(`HTML pattern: ${pattern.source.substring(0, 50)}`);
      }
    }

    // Check response headers
    for (const [header, pattern] of Object.entries(sig.headers)) {
      const val = headers[header];
      if (val && pattern.test(typeof val === 'string' ? val : JSON.stringify(val))) {
        confidence += 30;
        evidence.push(`Header: ${header}`);
      }
    }

    if (confidence > 0) {
      detected.push({
        cms: cms.charAt(0).toUpperCase() + cms.slice(1),
        id: cms,
        confidence: Math.min(confidence, 100),
        version,
        evidence,
      });
    }
  }

  return detected.sort((a, b) => b.confidence - a.confidence);
}

// ─── 2. WordPress Deep Scan ───

async function wordpressDeepScan(baseUrl, html, onProgress) {
  if (onProgress) onProgress('Running WordPress deep scan...');

  const result = {
    isWordPress: false,
    version: null,
    themes: [],
    plugins: [],
    users: [],
    xmlrpc: false,
    wpCron: false,
    debug: false,
    restApi: null,
    uploads: null,
    readme: null,
    loginPage: null,
    registration: false,
  };

  // Check wp-login.php
  try {
    const loginResp = await ax.get(`${baseUrl}/wp-login.php`);
    if (loginResp.status === 200 && /wp-login/i.test(loginResp.data)) {
      result.isWordPress = true;
      result.loginPage = `${baseUrl}/wp-login.php`;

      // Check if registration is enabled
      if (/registration/i.test(loginResp.data) || /wp-login\.php\?action=register/i.test(loginResp.data)) {
        result.registration = true;
      }
    }
  } catch {}

  if (!result.isWordPress) {
    // Quick check wp-includes
    try {
      const resp = await ax.get(`${baseUrl}/wp-includes/js/wp-embed.min.js`);
      if (resp.status === 200) result.isWordPress = true;
    } catch {}
  }

  if (!result.isWordPress) return result;

  // ── WP REST API (user enumeration) ──
  try {
    const usersResp = await ax.get(`${baseUrl}/wp-json/wp/v2/users`);
    if (usersResp.status === 200 && Array.isArray(usersResp.data)) {
      result.users = usersResp.data.map(u => ({
        id: u.id,
        name: u.name,
        slug: u.slug,
        description: u.description?.substring(0, 200),
        avatar: u.avatar_urls?.['96'] || null,
        link: u.link,
      }));
      result.restApi = 'accessible';
    } else if (usersResp.status === 401 || usersResp.status === 403) {
      result.restApi = 'restricted';
    }
  } catch {
    result.restApi = 'unavailable';
  }

  // ── User enumeration via author pages ──
  if (result.users.length === 0) {
    for (let i = 1; i <= 10; i++) {
      try {
        const resp = await ax.get(`${baseUrl}/?author=${i}`, { maxRedirects: 0, validateStatus: () => true });
        if (resp.status === 301 || resp.status === 302) {
          const location = resp.headers['location'] || '';
          const authorMatch = location.match(/\/author\/([^/]+)/);
          if (authorMatch) {
            result.users.push({ id: i, slug: authorMatch[1] });
          }
        }
      } catch {}
    }
  }

  // Run remaining checks in parallel
  const checks = [];

  // ── XML-RPC ──
  checks.push((async () => {
    try {
      const resp = await ax.post(`${baseUrl}/xmlrpc.php`, '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>', {
        headers: { 'Content-Type': 'text/xml' },
      });
      if (resp.status === 200 && /methodResponse/i.test(resp.data)) {
        result.xmlrpc = true;
      }
    } catch {}
  })());

  // ── WP-Cron ──
  checks.push((async () => {
    try {
      const resp = await ax.get(`${baseUrl}/wp-cron.php`);
      if (resp.status === 200 || resp.status === 204) result.wpCron = true;
    } catch {}
  })());

  // ── Debug log ──
  checks.push((async () => {
    try {
      const resp = await ax.get(`${baseUrl}/wp-content/debug.log`);
      if (resp.status === 200 && resp.data.length > 50) {
        result.debug = true;
      }
    } catch {}
  })());

  // ── Version from readme ──
  checks.push((async () => {
    try {
      const resp = await ax.get(`${baseUrl}/readme.html`);
      if (resp.status === 200) {
        const vMatch = resp.data.match(/Version\s+([\d.]+)/i);
        if (vMatch) result.version = vMatch[1];
        result.readme = true;
      }
    } catch {}
  })());

  // ── Version from RSS ──
  checks.push((async () => {
    if (!result.version) {
      try {
        const resp = await ax.get(`${baseUrl}/feed/`);
        if (resp.status === 200) {
          const vMatch = resp.data.match(/generator>https?:\/\/wordpress\.org\/\?v=([\d.]+)/i);
          if (vMatch) result.version = vMatch[1];
        }
      } catch {}
    }
  })());

  // ── Uploads directory listing ──
  checks.push((async () => {
    try {
      const resp = await ax.get(`${baseUrl}/wp-content/uploads/`);
      if (resp.status === 200 && /index of/i.test(resp.data)) {
        result.uploads = 'directory-listing-enabled';
      } else if (resp.status === 200) {
        result.uploads = 'accessible';
      } else if (resp.status === 403) {
        result.uploads = 'forbidden';
      }
    } catch {}
  })());

  await Promise.allSettled(checks);

  // ── Plugin & Theme Enumeration (from HTML) ──
  if (onProgress) onProgress('Enumerating WordPress plugins & themes...');

  // Common plugins to check
  const pluginsToCheck = [
    'akismet', 'jetpack', 'yoast-seo', 'wordfence', 'contact-form-7',
    'woocommerce', 'elementor', 'wpforms-lite', 'classic-editor', 'really-simple-ssl',
    'all-in-one-seo-pack', 'updraftplus', 'wp-super-cache', 'w3-total-cache',
    'google-analytics-for-wordpress', 'wordpress-seo', 'litespeed-cache',
    'wp-mail-smtp', 'duplicate-post', 'redirection', 'google-sitemap-generator',
    'regenerate-thumbnails', 'advanced-custom-fields', 'custom-post-type-ui',
    'sucuri-scanner', 'ithemes-security', 'wp-optimize', 'autoptimize',
    'better-wp-security', 'limit-login-attempts-reloaded', 'coming-soon',
  ];

  const pluginChecks = pluginsToCheck.map(async (plugin) => {
    try {
      const resp = await ax.get(`${baseUrl}/wp-content/plugins/${plugin}/readme.txt`, { timeout: 5000 });
      if (resp.status === 200 && resp.data.length > 50) {
        const vMatch = resp.data.match(/Stable tag:\s*([\d.]+)/i);
        return { name: plugin, version: vMatch?.[1] || 'unknown', detected: true };
      }
    } catch {}
    return null;
  });

  const pluginResults = await Promise.allSettled(pluginChecks);
  for (const r of pluginResults) {
    if (r.status === 'fulfilled' && r.value) {
      result.plugins.push(r.value);
    }
  }

  // ── Theme detection ──
  const themesToCheck = [
    'twentytwentyfive', 'twentytwentyfour', 'twentytwentythree',
    'twentytwentytwo', 'twentytwentyone', 'twentytwenty',
    'twentynineteen', 'twentyseventeen', 'twentysixteen',
    'astra', 'oceanwp', 'generatepress',
    'kadence', 'neve', 'hello-elementor',
    'storefront', 'blocksy', 'hestia',
    'sydney', 'zakra', 'colormag',
  ];

  // Probe known themes via style.css
  const themeProbes = themesToCheck.map(async (theme) => {
    try {
      const resp = await ax.get(`${baseUrl}/wp-content/themes/${theme}/style.css`, { timeout: 5000 });
      if (resp.status === 200 && resp.data.length > 50) {
        const vMatch = resp.data.match(/Version:\s*([\d.]+)/i);
        const nameMatch = resp.data.match(/Theme Name:\s*(.+)/i);
        return { name: theme, displayName: nameMatch?.[1]?.trim() || theme, version: vMatch?.[1] || 'unknown', active: false };
      }
    } catch {}
    return null;
  });
  const themeProbeResults = await Promise.allSettled(themeProbes);
  for (const r of themeProbeResults) {
    if (r.status === 'fulfilled' && r.value && !result.themes.find(t => t.name === r.value.name)) {
      result.themes.push(r.value);
    }
  }

  // Also detect active theme from the HTML we already have
  try {
    const themeHtml = html || '';
    if (themeHtml) {
      const themeMatches = themeHtml.match(/wp-content\/themes\/([a-z0-9_-]+)/gi) || [];
      const detectedThemes = [...new Set(themeMatches.map(m => m.replace(/.*themes\//i, '')))];
      for (const theme of detectedThemes) {
        if (!result.themes.find(t => t.name === theme)) {
          // Get version from style.css
          try {
            const styleResp = await ax.get(`${baseUrl}/wp-content/themes/${theme}/style.css`, { timeout: 5000 });
            if (styleResp.status === 200) {
              const vMatch = styleResp.data.match(/Version:\s*([\d.]+)/i);
              const nameMatch = styleResp.data.match(/Theme Name:\s*(.+)/i);
              result.themes.push({
                name: theme,
                displayName: nameMatch?.[1]?.trim() || theme,
                version: vMatch?.[1] || 'unknown',
                active: true,
              });
            }
          } catch {}
        }
      }
    }
  } catch {}

  if (onProgress) onProgress(`WordPress scan: ${result.plugins.length} plugins, ${result.themes.length} themes, ${result.users.length} users`);

  return result;
}

// ─── 3. CMS Path Probing ───

async function probeCMSPaths(baseUrl, cmsId) {
  const sig = CMS_SIGNATURES[cmsId];
  if (!sig || !sig.paths) return [];

  const results = [];
  const checks = sig.paths.map(async (path) => {
    try {
      const resp = await ax.get(`${baseUrl}${path}`, { timeout: 5000 });
      if (resp.status < 400) {
        return { path, status: resp.status, accessible: true };
      }
    } catch {}
    return null;
  });

  const settled = await Promise.allSettled(checks);
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value) results.push(r.value);
  }

  return results;
}

// ─── Main Export ───

export async function detectAndScanCMS(url, html, headers = {}, onProgress) {
  if (onProgress) onProgress('Detecting CMS...');

  const detected = detectCMS(html, headers);
  const result = {
    detected,
    primaryCMS: detected[0] || null,
    wordpress: null,
    cmsSpecificPaths: [],
  };

  // If WordPress detected, run deep scan
  const isWP = detected.some(d => d.id === 'wordpress');
  const baseUrl = new URL(url).origin;

  if (isWP) {
    result.wordpress = await wordpressDeepScan(baseUrl, html, onProgress);
    // Get WP version from HTML if not found
    if (!result.wordpress.version) {
      const vMatch = html.match(/content="WordPress\s+([\d.]+)"/i);
      if (vMatch) result.wordpress.version = vMatch[1];
    }
  }

  // Probe CMS-specific paths for top detected CMS
  if (detected[0]) {
    result.cmsSpecificPaths = await probeCMSPaths(baseUrl, detected[0].id);
  }

  if (onProgress) onProgress(`CMS detected: ${detected.map(d => d.cms).join(', ') || 'None identified'}`);

  return result;
}
