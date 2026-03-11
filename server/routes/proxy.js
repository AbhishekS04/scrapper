import { Router } from 'express';
import axios from 'axios';

export const proxyRoutes = Router();

/**
 * GET /api/proxy?url=...
 * Fetches a remote page server-side and re-serves it from our domain.
 * This strips X-Frame-Options / CSP from the response so it can be
 * embedded in an iframe for the Visual Selector.
 * An element-picker overlay script is injected before </body>.
 */
proxyRoutes.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing ?url= parameter');

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).send('Only HTTP/HTTPS URLs are supported');
    }
  } catch {
    return res.status(400).send('Invalid URL');
  }

  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
      responseType: 'text',
    });

    let html = response.data;
    if (typeof html !== 'string') {
      return res.status(400).send('Page did not return HTML');
    }

    // ── Rewrite relative URLs to absolute ──────────────────────────────
    const base = `${parsedUrl.protocol}//${parsedUrl.host}`;
    html = html
      .replace(/(href|src|action)="(\/(?!\/))/gi, `$1="${base}/`)
      .replace(/(href|src|action)='(\/(?!\/))/gi, `$1='${base}/`);

    // ── Inject <base> tag so all relative resources resolve correctly ──
    if (/<head/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}/">`);
    } else {
      html = `<base href="${base}/">` + html;
    }

    // ── Strip CSP meta tags ────────────────────────────────────────────
    html = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    // ── Inject element picker overlay ──────────────────────────────────
    const pickerScript = `
<style>
  .__vs-hover {
    outline: 2px solid #6366f1 !important;
    outline-offset: 2px !important;
    background: rgba(99,102,241,0.07) !important;
    cursor: crosshair !important;
  }
  .__vs-selected {
    outline: 2px solid #10b981 !important;
    background: rgba(16,185,129,0.09) !important;
  }
</style>
<script>
(function() {
  let active = false, hovered = null;

  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    let cur = el;
    while (cur && cur !== document.documentElement && parts.length < 6) {
      let seg = cur.tagName.toLowerCase();
      if (cur.id) { seg = '#' + CSS.escape(cur.id); parts.unshift(seg); break; }
      const parent = cur.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (same.length > 1) seg += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
      }
      const cls = (cur.className && typeof cur.className === 'string')
        ? cur.className.trim().split(/\\s+/).filter(c => c && !c.startsWith('__vs') && c.length < 40).slice(0, 2)
        : [];
      if (cls.length) try { seg += '.' + cls.map(c => CSS.escape(c)).join('.'); } catch {}
      parts.unshift(seg);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  window.addEventListener('message', (e) => {
    if (e.data === 'vs:on')  { active = true;  document.body.style.cursor = 'crosshair'; }
    if (e.data === 'vs:off') { active = false; document.body.style.cursor = ''; if (hovered) { hovered.classList.remove('__vs-hover'); hovered = null; } }
  });

  document.addEventListener('mouseover', (e) => {
    if (!active) return;
    if (hovered) hovered.classList.remove('__vs-hover');
    hovered = e.target; hovered.classList.add('__vs-hover');
  }, true);

  document.addEventListener('click', (e) => {
    if (!active) return;
    e.preventDefault(); e.stopPropagation();
    const el = e.target;
    el.classList.remove('__vs-hover'); el.classList.add('__vs-selected');
    const selector = getSelector(el);
    const text = (el.innerText || el.textContent || '').trim().substring(0, 100);
    const tag = el.tagName.toLowerCase();
    let count = 0; try { count = document.querySelectorAll(selector).length; } catch {}
    window.parent.postMessage({ type: 'vs:picked', selector, text, tag, count }, '*');
  }, true);
})();
</script>`;

    html = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, pickerScript + '</body>')
      : html + pickerScript;

    // ── Set headers — critically: do NOT set X-Frame-Options ──────────
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Explicitly remove any frame-blocking the upstream may have caused Express to inherit
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.removeHeader('Cross-Origin-Opener-Policy');
    // Do NOT call res.setHeader('X-Frame-Options', ...) — omitting it entirely allows framing
    res.send(html);

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).send(`
      <html><body style="background:#0a0a0a;color:#ef4444;font-family:monospace;padding:2rem;margin:0">
        <h2 style="margin:0 0 1rem">⚠️ Failed to load page</h2>
        <p style="margin:0 0 0.5rem;color:#f87171">${err.message}</p>
        <p style="color:#6b7280;font-size:0.85rem">The site may be blocking server-side requests. Try a different URL.</p>
      </body></html>
    `);
  }
});

/**
 * POST /api/selector-scrape
 * Scrapes a URL using CSS selectors via Playwright.
 */
proxyRoutes.post('/selector-scrape', async (req, res) => {
  const { url, selectors } = req.body;
  if (!url || !selectors?.length) {
    return res.status(400).json({ error: 'url and selectors[] are required' });
  }

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await (await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    })).newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const results = {};
    for (const { name, selector } of selectors) {
      try {
        results[name] = await page.$$eval(selector, els => els.map(el => ({
          text: (el.innerText || el.textContent || '').trim(),
          html: el.outerHTML.substring(0, 500),
          href: el.getAttribute?.('href') || null,
          src: el.getAttribute?.('src') || null,
          tag: el.tagName.toLowerCase(),
        })));
      } catch { results[name] = []; }
    }

    await browser.close();
    res.json({ url, results });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('Selector scrape error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
