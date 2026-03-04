/**
 * Brutal Reconnaissance Service
 * Probes for sensitive files, admin panels, source maps, subdomains, WHOIS, favicon hashing
 */
import axios from 'axios';
import crypto from 'crypto';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT = 8000;

// ─── Sensitive File Probing ──────────────────────────────────
const SENSITIVE_PATHS = [
  // Environment / config
  { path: '/.env', category: 'config', severity: 'critical', description: 'Environment variables file' },
  { path: '/.env.local', category: 'config', severity: 'critical', description: 'Local env file' },
  { path: '/.env.production', category: 'config', severity: 'critical', description: 'Production env file' },
  { path: '/.env.backup', category: 'config', severity: 'critical', description: 'Env backup file' },
  { path: '/config.json', category: 'config', severity: 'high', description: 'JSON config' },
  { path: '/config.yml', category: 'config', severity: 'high', description: 'YAML config' },
  { path: '/config.yaml', category: 'config', severity: 'high', description: 'YAML config' },
  { path: '/settings.json', category: 'config', severity: 'high', description: 'Settings file' },
  { path: '/secrets.json', category: 'config', severity: 'critical', description: 'Secrets file' },

  // Source control
  { path: '/.git/config', category: 'source-control', severity: 'critical', description: 'Git config (repo exposure)' },
  { path: '/.git/HEAD', category: 'source-control', severity: 'critical', description: 'Git HEAD (repo accessible)' },
  { path: '/.gitignore', category: 'source-control', severity: 'low', description: 'Git ignore file' },
  { path: '/.svn/entries', category: 'source-control', severity: 'critical', description: 'SVN entries' },
  { path: '/.hg/dirstate', category: 'source-control', severity: 'critical', description: 'Mercurial dirstate' },

  // IDE / Editor
  { path: '/.vscode/settings.json', category: 'ide', severity: 'medium', description: 'VS Code settings' },
  { path: '/.idea/workspace.xml', category: 'ide', severity: 'medium', description: 'IntelliJ workspace' },
  { path: '/.DS_Store', category: 'ide', severity: 'low', description: 'macOS directory metadata' },
  { path: '/Thumbs.db', category: 'ide', severity: 'low', description: 'Windows thumbnail cache' },

  // Server config
  { path: '/web.config', category: 'server', severity: 'medium', description: 'IIS config' },
  { path: '/.htaccess', category: 'server', severity: 'medium', description: 'Apache config' },
  { path: '/nginx.conf', category: 'server', severity: 'high', description: 'Nginx config' },
  { path: '/server-status', category: 'server', severity: 'high', description: 'Apache server status' },
  { path: '/server-info', category: 'server', severity: 'high', description: 'Apache server info' },

  // Debug / Logs
  { path: '/debug.log', category: 'logs', severity: 'high', description: 'Debug log' },
  { path: '/error.log', category: 'logs', severity: 'high', description: 'Error log' },
  { path: '/access.log', category: 'logs', severity: 'medium', description: 'Access log' },
  { path: '/logs/error.log', category: 'logs', severity: 'high', description: 'Error log' },
  { path: '/trace.axd', category: 'logs', severity: 'high', description: '.NET trace' },
  { path: '/elmah.axd', category: 'logs', severity: 'high', description: '.NET error log' },

  // CMS / Application
  { path: '/wp-config.php.bak', category: 'cms', severity: 'critical', description: 'WordPress config backup' },
  { path: '/wp-config.php~', category: 'cms', severity: 'critical', description: 'WordPress config backup' },
  { path: '/wp-config.php.old', category: 'cms', severity: 'critical', description: 'WordPress config old' },
  { path: '/wp-config.php.save', category: 'cms', severity: 'critical', description: 'WordPress config save' },
  { path: '/configuration.php.bak', category: 'cms', severity: 'critical', description: 'Joomla config backup' },

  // Database
  { path: '/dump.sql', category: 'database', severity: 'critical', description: 'SQL dump' },
  { path: '/backup.sql', category: 'database', severity: 'critical', description: 'SQL backup' },
  { path: '/database.sql', category: 'database', severity: 'critical', description: 'Database dump' },
  { path: '/db.sqlite', category: 'database', severity: 'critical', description: 'SQLite database' },
  { path: '/data.db', category: 'database', severity: 'critical', description: 'Database file' },

  // Package info
  { path: '/package.json', category: 'package', severity: 'low', description: 'Node.js package info' },
  { path: '/composer.json', category: 'package', severity: 'low', description: 'PHP Composer info' },
  { path: '/Gemfile', category: 'package', severity: 'low', description: 'Ruby dependencies' },
  { path: '/requirements.txt', category: 'package', severity: 'low', description: 'Python dependencies' },
  { path: '/package-lock.json', category: 'package', severity: 'info', description: 'Node.js lockfile' },

  // API docs / admin
  { path: '/phpinfo.php', category: 'debug', severity: 'critical', description: 'PHP info page' },
  { path: '/info.php', category: 'debug', severity: 'critical', description: 'PHP info page' },
  { path: '/test.php', category: 'debug', severity: 'medium', description: 'Test PHP file' },
  { path: '/.well-known/security.txt', category: 'security', severity: 'info', description: 'Security contact info' },

  // Backups
  { path: '/backup.zip', category: 'backup', severity: 'critical', description: 'Backup archive' },
  { path: '/backup.tar.gz', category: 'backup', severity: 'critical', description: 'Backup archive' },
  { path: '/site.zip', category: 'backup', severity: 'critical', description: 'Site backup' },
  { path: '/www.zip', category: 'backup', severity: 'critical', description: 'Site backup' },

  // Docs
  { path: '/README.md', category: 'docs', severity: 'info', description: 'Readme file' },
  { path: '/CHANGELOG.md', category: 'docs', severity: 'info', description: 'Changelog' },
  { path: '/LICENSE', category: 'docs', severity: 'info', description: 'License file' },
];

// ─── Admin Panel Paths ───────────────────────────────────────
const ADMIN_PATHS = [
  { path: '/admin', label: 'Admin' },
  { path: '/administrator', label: 'Administrator' },
  { path: '/admin/login', label: 'Admin Login' },
  { path: '/wp-admin', label: 'WordPress Admin' },
  { path: '/wp-login.php', label: 'WordPress Login' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/cpanel', label: 'cPanel' },
  { path: '/phpmyadmin', label: 'phpMyAdmin' },
  { path: '/adminer.php', label: 'Adminer' },
  { path: '/manager', label: 'Manager' },
  { path: '/user/login', label: 'User Login' },
  { path: '/login', label: 'Login' },
  { path: '/signin', label: 'Sign In' },
  { path: '/auth/login', label: 'Auth Login' },
  { path: '/panel', label: 'Panel' },
  { path: '/console', label: 'Console' },
  { path: '/admin/dashboard', label: 'Admin Dashboard' },
  { path: '/_admin', label: 'Internal Admin' },
  { path: '/manage', label: 'Manage' },
  { path: '/cms', label: 'CMS' },
  { path: '/backend', label: 'Backend' },
  { path: '/api/admin', label: 'API Admin' },
  { path: '/graphql', label: 'GraphQL' },
  { path: '/graphiql', label: 'GraphiQL' },
  { path: '/debug', label: 'Debug' },
  { path: '/status', label: 'Status Page' },
  { path: '/health', label: 'Health Check' },
  { path: '/metrics', label: 'Metrics' },
  { path: '/prometheus', label: 'Prometheus' },
];

async function probeUrl(url) {
  try {
    const resp = await axios.head(url, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': UA },
      validateStatus: () => true,
      maxRedirects: 3,
    });
    return { status: resp.status, headers: resp.headers, size: resp.headers['content-length'] };
  } catch {
    return null;
  }
}

/**
 * Probe for sensitive files
 */
export async function probeSensitiveFiles(baseUrl, onProgress) {
  const origin = new URL(baseUrl).origin;
  const found = [];
  const checked = [];
  const concurrency = 10;
  let idx = 0;

  const worker = async () => {
    while (idx < SENSITIVE_PATHS.length) {
      const entry = SENSITIVE_PATHS[idx++];
      const fullUrl = origin + entry.path;
      const result = await probeUrl(fullUrl);
      checked.push(entry.path);

      if (result && result.status >= 200 && result.status < 400) {
        // Verify it's not a redirect to homepage or 404 page
        const isLikelyReal = result.status === 200 && result.size && parseInt(result.size) > 0;
        found.push({
          ...entry,
          url: fullUrl,
          statusCode: result.status,
          contentLength: result.size || 'unknown',
          confirmed: isLikelyReal,
        });
      }

      if (onProgress) onProgress(`Probed ${checked.length}/${SENSITIVE_PATHS.length} paths`);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, SENSITIVE_PATHS.length) }, () => worker()));

  return {
    found,
    totalChecked: checked.length,
    criticalFindings: found.filter(f => f.severity === 'critical' && f.confirmed).length,
    highFindings: found.filter(f => f.severity === 'high' && f.confirmed).length,
  };
}

/**
 * Detect admin panels
 */
export async function detectAdminPanels(baseUrl, onProgress) {
  const origin = new URL(baseUrl).origin;
  const found = [];
  const concurrency = 8;
  let idx = 0;

  const worker = async () => {
    while (idx < ADMIN_PATHS.length) {
      const entry = ADMIN_PATHS[idx++];
      const fullUrl = origin + entry.path;
      try {
        const resp = await axios.get(fullUrl, {
          timeout: TIMEOUT,
          headers: { 'User-Agent': UA },
          validateStatus: () => true,
          maxRedirects: 5,
        });
        const status = resp.status;
        const finalUrl = resp.request?.res?.responseUrl || fullUrl;
        const html = typeof resp.data === 'string' ? resp.data : '';

        // Check if it's a real admin/login page, not a 404 or redirect to homepage
        const isLoginPage = /login|sign.?in|password|username|authenticate/i.test(html);
        const isFormPresent = /<form/i.test(html) && /<input/i.test(html);
        const isNotHomepage = finalUrl !== origin + '/' && finalUrl !== origin;

        if (status >= 200 && status < 400 && (isLoginPage || isFormPresent) && isNotHomepage) {
          found.push({
            ...entry,
            url: fullUrl,
            finalUrl,
            statusCode: status,
            hasLoginForm: isLoginPage,
            hasForm: isFormPresent,
          });
        }
      } catch {}

      if (onProgress) onProgress(`Checked ${idx}/${ADMIN_PATHS.length} admin paths`);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, ADMIN_PATHS.length) }, () => worker()));
  return found;
}

/**
 * Detect source maps that could leak source code
 */
export async function detectSourceMaps(html, baseUrl) {
  const maps = [];
  const origin = new URL(baseUrl).origin;

  // Find JS files referenced in HTML
  const scriptSrcRegex = /<script[^>]+src=["']([^"']+\.js)["']/gi;
  let match;
  const jsFiles = new Set();

  while ((match = scriptSrcRegex.exec(html)) !== null) {
    let src = match[1];
    try {
      src = new URL(src, origin).href;
      jsFiles.add(src);
    } catch {}
  }

  // Check inline sourceMappingURL comments
  const inlineMapRegex = /\/\/[#@]\s*sourceMappingURL=([^\s'"]+)/g;
  while ((match = inlineMapRegex.exec(html)) !== null) {
    const mapUrl = match[1];
    try {
      const absolute = new URL(mapUrl, origin).href;
      maps.push({ mapUrl: absolute, source: 'inline-comment', status: 'discovered' });
    } catch {}
  }

  // For each JS file, check if .map exists
  const concurrency = 5;
  const jsArray = [...jsFiles].slice(0, 30);
  let idx = 0;

  const worker = async () => {
    while (idx < jsArray.length) {
      const jsUrl = jsArray[idx++];
      const mapUrl = jsUrl + '.map';

      try {
        // First check the JS file for sourceMappingURL reference
        const jsResp = await axios.get(jsUrl, {
          timeout: TIMEOUT,
          headers: { 'User-Agent': UA },
          validateStatus: s => s < 500,
          maxContentLength: 2 * 1024 * 1024, // 2MB max
        });

        if (typeof jsResp.data === 'string') {
          const mapMatch = jsResp.data.match(/\/\/[#@]\s*sourceMappingURL=([^\s'"]+)/);
          if (mapMatch) {
            const refMapUrl = new URL(mapMatch[1], jsUrl).href;
            maps.push({ jsFile: jsUrl, mapUrl: refMapUrl, source: 'js-comment', status: 'referenced' });
          }
        }
      } catch {}

      // Also probe the .map URL directly
      try {
        const mapResp = await axios.head(mapUrl, {
          timeout: TIMEOUT,
          headers: { 'User-Agent': UA },
          validateStatus: () => true,
        });
        if (mapResp.status === 200) {
          maps.push({
            jsFile: jsUrl,
            mapUrl,
            source: 'convention',
            status: 'accessible',
            size: mapResp.headers['content-length'] || 'unknown',
          });
        }
      } catch {}
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, jsArray.length) }, () => worker()));
  return maps;
}

/**
 * Compute favicon hash (mmh3 for Shodan-style fingerprinting)
 */
export async function faviconHash(baseUrl) {
  const origin = new URL(baseUrl).origin;
  const faviconPaths = ['/favicon.ico', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png'];

  for (const path of faviconPaths) {
    try {
      const resp = await axios.get(origin + path, {
        timeout: TIMEOUT,
        responseType: 'arraybuffer',
        headers: { 'User-Agent': UA },
        validateStatus: s => s === 200,
        maxContentLength: 1024 * 1024,
      });

      const base64 = Buffer.from(resp.data).toString('base64');
      // Simple hash for fingerprinting (MurmurHash3-like via MD5)
      const md5 = crypto.createHash('md5').update(base64).digest('hex');
      const sha256 = crypto.createHash('sha256').update(resp.data).digest('hex');

      return {
        url: origin + path,
        md5Hash: md5,
        sha256Hash: sha256,
        size: resp.data.length,
        base64Preview: base64.substring(0, 200),
      };
    } catch {}
  }

  return null;
}

/**
 * Subdomain discovery via Certificate Transparency (crt.sh)
 */
export async function discoverSubdomains(hostname) {
  const subdomains = new Set();
  try {
    const resp = await axios.get(`https://crt.sh/?q=${encodeURIComponent(`%.${hostname}`)}&output=json`, {
      timeout: 15000,
      headers: { 'User-Agent': UA },
      validateStatus: s => s === 200,
    });

    if (Array.isArray(resp.data)) {
      for (const entry of resp.data) {
        const names = (entry.name_value || '').split('\n');
        for (const name of names) {
          const clean = name.trim().toLowerCase().replace(/^\*\./, '');
          if (clean.endsWith(hostname) && clean !== hostname) {
            subdomains.add(clean);
          }
        }
      }
    }
  } catch {}

  return {
    subdomains: [...subdomains].sort(),
    count: subdomains.size,
    source: 'crt.sh',
  };
}

/**
 * WHOIS-like info from RDAP (public, no API key needed)
 */
export async function whoisLookup(hostname) {
  // Remove subdomains to get registrable domain
  // Handle multi-level TLDs like .co.uk, .com.au, .org.uk etc.
  const MULTI_TLDS = ['co.uk', 'com.au', 'co.in', 'org.uk', 'net.au', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'com.br', 'com.mx', 'com.sg', 'com.hk', 'com.tw', 'ac.uk', 'gov.uk', 'org.au', 'ac.in', 'gov.in'];
  const parts = hostname.split('.');
  let domain = hostname;
  if (parts.length > 2) {
    const lastTwo = parts.slice(-2).join('.');
    if (MULTI_TLDS.includes(lastTwo) && parts.length > 3) {
      domain = parts.slice(-3).join('.');
    } else {
      domain = parts.slice(-2).join('.');
    }
  }

  try {
    const resp = await axios.get(`https://rdap.org/domain/${domain}`, {
      timeout: 10000,
      headers: { 'User-Agent': UA, Accept: 'application/rdap+json' },
      validateStatus: s => s === 200,
    });

    const data = resp.data;
    const events = data.events || [];
    const registration = events.find(e => e.eventAction === 'registration');
    const expiration = events.find(e => e.eventAction === 'expiration');
    const lastChanged = events.find(e => e.eventAction === 'last changed');

    // Extract nameservers
    const nameservers = (data.nameservers || []).map(ns => ns.ldhName || ns.unicodeName).filter(Boolean);

    // Extract registrar
    const registrarEntity = (data.entities || []).find(e => (e.roles || []).includes('registrar'));
    const registrar = registrarEntity?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || registrarEntity?.handle || null;

    // Extract status
    const status = data.status || [];

    return {
      domain,
      registrar,
      registrationDate: registration?.eventDate || null,
      expirationDate: expiration?.eventDate || null,
      lastChanged: lastChanged?.eventDate || null,
      nameservers,
      status,
      dnssec: data.secureDNS?.delegationSigned || false,
      source: 'RDAP',
    };
  } catch {
    return { domain, error: 'WHOIS lookup failed', source: 'RDAP' };
  }
}

/**
 * Run all brutal recon
 */
export async function runBrutalRecon(url, html, onProgress) {
  const hostname = new URL(url).hostname;

  const progressFn = (msg) => { if (onProgress) onProgress(msg); };

  const [sensitiveFiles, adminPanels, sourceMaps, favicon, subdomains, whois] = await Promise.allSettled([
    probeSensitiveFiles(url, progressFn),
    detectAdminPanels(url, progressFn),
    detectSourceMaps(html, url),
    faviconHash(url),
    discoverSubdomains(hostname),
    whoisLookup(hostname),
  ]);

  return {
    sensitiveFiles: sensitiveFiles.status === 'fulfilled' ? sensitiveFiles.value : { found: [], error: sensitiveFiles.reason?.message },
    adminPanels: adminPanels.status === 'fulfilled' ? adminPanels.value : [],
    sourceMaps: sourceMaps.status === 'fulfilled' ? sourceMaps.value : [],
    favicon: favicon.status === 'fulfilled' ? favicon.value : null,
    subdomains: subdomains.status === 'fulfilled' ? subdomains.value : { subdomains: [], count: 0 },
    whois: whois.status === 'fulfilled' ? whois.value : { error: 'failed' },
  };
}
