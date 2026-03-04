/**
 * Content Intelligence Service
 * Deep content analysis: keyword density, readability, n-grams,
 * broken link checking, image audit, duplicate content detection
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

// ─── Text Extraction Helpers ───

function extractVisibleText($) {
  $('script, style, noscript, svg, path').remove();
  const text = $('body').text() || '';
  return text.replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s'-]/g, '').split(/\s+/).filter(w => w.length > 1);
}

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on',
  'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we',
  'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into',
  'year', 'your', 'good', 'some', 'could', 'them', 'than', 'other', 'now', 'look', 'only',
  'come', 'its', 'over', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'way',
  'want', 'because', 'any', 'these', 'us', 'been', 'are', 'is', 'was', 'were', 'has', 'had',
  'may', 'more', 'new', 'very', 'am', 'did', 'does', 'being', 'such', 'then', 'should', 'each',
]);

// ─── 1. Keyword Density & TF-IDF ───

function analyzeKeywordDensity(text) {
  const words = tokenize(text);
  const totalWords = words.length;
  if (totalWords === 0) return { totalWords: 0, keywords: [], density: {} };

  // Word frequency
  const freq = {};
  for (const w of words) {
    if (!STOP_WORDS.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }

  // Sort by frequency
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  // Calculate density
  const density = {};
  for (const [word, count] of sorted) {
    density[word] = {
      count,
      density: Number(((count / totalWords) * 100).toFixed(2)),
      tf: Number((count / totalWords).toFixed(6)),
    };
  }

  // 2-word phrases
  const bigramFreq = {};
  for (let i = 0; i < words.length - 1; i++) {
    if (!STOP_WORDS.has(words[i]) || !STOP_WORDS.has(words[i + 1])) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      bigramFreq[bigram] = (bigramFreq[bigram] || 0) + 1;
    }
  }
  const topBigrams = Object.entries(bigramFreq)
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([phrase, count]) => ({ phrase, count, density: Number(((count / totalWords) * 100).toFixed(2)) }));

  // 3-word phrases
  const trigramFreq = {};
  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    trigramFreq[trigram] = (trigramFreq[trigram] || 0) + 1;
  }
  const topTrigrams = Object.entries(trigramFreq)
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([phrase, count]) => ({ phrase, count }));

  return {
    totalWords,
    uniqueWords: Object.keys(freq).length,
    avgWordLength: Number((words.reduce((s, w) => s + w.length, 0) / totalWords).toFixed(1)),
    topKeywords: sorted.slice(0, 25).map(([word, count]) => ({ word, count, density: density[word].density })),
    topBigrams,
    topTrigrams,
    density,
  };
}

// ─── 2. Readability Scores ───

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function analyzeReadability(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const words = tokenize(text);
  const totalWords = words.length;

  // Guard against empty/no text — return neutral defaults
  if (totalWords === 0) {
    return {
      fleschReadingEase: { score: 0, label: 'No content' },
      fleschKincaidGrade: 0,
      gunningFogIndex: 0,
      colemanLiauIndex: 0,
      ari: 0,
      smog: 0,
      stats: { totalWords: 0, totalSentences: 0, totalSyllables: 0, complexWords: 0, avgWordLength: 0, avgSentenceLength: 0 },
    };
  }

  const totalSentences = sentences.length || 1;
  const totalSyllables = words.reduce((s, w) => s + countSyllables(w), 0);
  const complexWords = words.filter(w => countSyllables(w) >= 3).length;
  const charsInWords = words.reduce((s, w) => s + w.length, 0);

  // Flesch Reading Ease (0-100, higher = easier)
  const fleschEase = 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);

  // Flesch-Kincaid Grade Level
  const fleschKincaid = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;

  // Gunning Fog Index
  const gunningFog = 0.4 * ((totalWords / totalSentences) + 100 * (complexWords / totalWords));

  // Coleman-Liau Index
  const L = (charsInWords / totalWords) * 100;
  const S = (totalSentences / totalWords) * 100;
  const colemanLiau = 0.0588 * L - 0.296 * S - 15.8;

  // Automated Readability Index
  const ari = 4.71 * (charsInWords / totalWords) + 0.5 * (totalWords / totalSentences) - 21.43;

  // SMOG Index (needs 30+ sentences ideally)
  const smog = 1.0430 * Math.sqrt(complexWords * (30 / totalSentences)) + 3.1291;

  const getFleschLabel = (score) => {
    if (score >= 90) return 'Very Easy (5th grade)';
    if (score >= 80) return 'Easy (6th grade)';
    if (score >= 70) return 'Fairly Easy (7th grade)';
    if (score >= 60) return 'Standard (8th-9th grade)';
    if (score >= 50) return 'Fairly Difficult (10th-12th grade)';
    if (score >= 30) return 'Difficult (College)';
    return 'Very Difficult (College Graduate+)';
  };

  return {
    fleschReadingEase: { score: Number(fleschEase.toFixed(1)), label: getFleschLabel(fleschEase) },
    fleschKincaidGrade: Number(fleschKincaid.toFixed(1)),
    gunningFogIndex: Number(gunningFog.toFixed(1)),
    colemanLiauIndex: Number(colemanLiau.toFixed(1)),
    automatedReadabilityIndex: Number(ari.toFixed(1)),
    smogIndex: Number(smog.toFixed(1)),
    stats: {
      totalWords,
      totalSentences,
      totalSyllables,
      complexWords,
      avgWordsPerSentence: Number((totalWords / totalSentences).toFixed(1)),
      avgSyllablesPerWord: Number((totalSyllables / totalWords).toFixed(1)),
      percentComplexWords: Number(((complexWords / totalWords) * 100).toFixed(1)),
    },
  };
}

// ─── 3. Broken Link Checker ───

async function checkBrokenLinks(html, baseUrl, onProgress) {
  const $ = cheerio.load(html);
  const links = new Map(); // url -> element info
  const base = new URL(baseUrl);

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    try {
      const fullUrl = new URL(href, baseUrl).href;
      if (!links.has(fullUrl)) {
        links.set(fullUrl, {
          url: fullUrl,
          text: $(el).text().trim().substring(0, 100),
          isExternal: new URL(fullUrl).hostname !== base.hostname,
          rel: $(el).attr('rel') || '',
        });
      }
    } catch {}
  });

  const allLinks = [...links.values()];
  const results = [];
  const CONCURRENCY = 10;
  let checked = 0;

  if (onProgress) onProgress(`Checking ${allLinks.length} links for broken ones...`);

  const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  // Check in batches
  for (let i = 0; i < allLinks.length; i += CONCURRENCY) {
    const batch = allLinks.slice(i, i + CONCURRENCY);
    const checks = batch.map(async (link) => {
      try {
        // Try HEAD first (faster)
        let resp = await axios.head(link.url, {
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: () => true,
          headers: {
            'User-Agent': BROWSER_UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': baseUrl,
          },
        });
        // If HEAD returns 403/405/501, retry with GET (some servers block HEAD)
        if ([403, 405, 501].includes(resp.status)) {
          resp = await axios.get(link.url, {
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: () => true,
            responseType: 'arraybuffer',
            maxContentLength: 50 * 1024 * 1024, // 50MB limit to avoid hanging on huge files
            headers: {
              'User-Agent': BROWSER_UA,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': baseUrl,
              'Range': 'bytes=0-0', // Only request 1 byte to minimize download
            },
          });
          // 206 Partial Content = file exists and serves content
          if (resp.status === 206) resp.status = 200;
        }
        const finalUrl = resp.request?.res?.responseUrl || resp.request?.responseURL || link.url;
        return { ...link, status: resp.status, ok: resp.status < 400, redirected: finalUrl !== link.url };
      } catch (err) {
        return { ...link, status: 0, ok: false, error: err.code || err.message?.substring(0, 50) };
      }
    });
    const batchResults = await Promise.allSettled(checks);
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value);
      checked++;
    }
    if (onProgress && i % 30 === 0) onProgress(`Checked ${checked}/${allLinks.length} links`);
  }

  const broken = results.filter(r => !r.ok);
  const redirected = results.filter(r => r.redirected);

  return {
    totalLinks: results.length,
    brokenLinks: broken.length,
    brokenDetails: broken.slice(0, 50),
    redirectedLinks: redirected.length,
    redirectedDetails: redirected.slice(0, 30),
    externalLinks: results.filter(r => r.isExternal).length,
    internalLinks: results.filter(r => !r.isExternal).length,
    healthScore: results.length > 0 ? Number((((results.length - broken.length) / results.length) * 100).toFixed(1)) : 100,
  };
}

// ─── 4. Image Optimization Audit ───

function auditImages(html, baseUrl) {
  const $ = cheerio.load(html);
  const images = [];
  const issues = [];

  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    const info = {
      src: src.substring(0, 300),
      alt: $el.attr('alt') ?? null,
      width: $el.attr('width') || null,
      height: $el.attr('height') || null,
      loading: $el.attr('loading') || null,
      decoding: $el.attr('decoding') || null,
      srcset: $el.attr('srcset') ? true : false,
      sizes: $el.attr('sizes') || null,
      isDataUrl: src.startsWith('data:'),
      format: null,
      issues: [],
    };

    // Detect format
    const ext = src.split('?')[0].split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'ico', 'bmp', 'tiff'].includes(ext)) {
      info.format = ext;
    }

    // Check for issues
    if (!info.alt && info.alt !== '') {
      info.issues.push('missing-alt');
      issues.push({ src: info.src, issue: 'Missing alt attribute' });
    } else if (info.alt === '') {
      info.issues.push('empty-alt');
    }

    if (!info.width || !info.height) {
      info.issues.push('missing-dimensions');
      issues.push({ src: info.src, issue: 'Missing width/height (causes layout shift)' });
    }

    if (!info.loading) {
      info.issues.push('no-lazy-load');
    }

    if (!info.srcset) {
      info.issues.push('no-srcset');
    }

    if (info.format === 'png' || info.format === 'jpg' || info.format === 'jpeg') {
      info.issues.push('not-modern-format');
      issues.push({ src: info.src, issue: `Using ${info.format} instead of WebP/AVIF` });
    }

    if (info.isDataUrl && src.length > 5000) {
      info.issues.push('large-data-url');
      issues.push({ src: 'data:...', issue: `Large inline data URL (${(src.length / 1024).toFixed(1)} KB)` });
    }

    images.push(info);
  });

  // CSS background images
  const bgImages = [];
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const bgMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/g);
    if (bgMatch) {
      bgMatch.forEach(m => {
        const url = m.replace(/url\(['"]?/, '').replace(/['"]?\)/, '');
        bgImages.push(url.substring(0, 300));
      });
    }
  });

  const withAlt = images.filter(i => i.alt !== null && i.alt !== '').length;
  const withDimensions = images.filter(i => i.width && i.height).length;
  const withLazyLoad = images.filter(i => i.loading === 'lazy').length;
  const withSrcset = images.filter(i => i.srcset).length;
  const modernFormat = images.filter(i => ['webp', 'avif', 'svg'].includes(i.format)).length;

  return {
    totalImages: images.length,
    backgroundImages: bgImages.length,
    withAlt,
    withDimensions,
    withLazyLoad,
    withSrcset,
    modernFormatCount: modernFormat,
    issues: issues.slice(0, 50),
    score: images.length > 0
      ? Number(((
        (withAlt / images.length) * 25 +
        (withDimensions / images.length) * 25 +
        (withLazyLoad / images.length) * 20 +
        (modernFormat / images.length) * 15 +
        (withSrcset / images.length) * 15
      )).toFixed(1))
      : 100,
    details: images.slice(0, 100),
    backgroundImageUrls: bgImages.slice(0, 30),
  };
}

// ─── 5. Content Structure Analysis ───

function analyzeContentStructure(html) {
  const $ = cheerio.load(html);

  // Heading hierarchy
  const headings = [];
  const headingIssues = [];
  let prevLevel = 0;

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt(el.tagName[1]);
    const text = $(el).text().trim().substring(0, 200);
    headings.push({ level, text, tag: el.tagName });

    if (prevLevel > 0 && level > prevLevel + 1) {
      headingIssues.push(`Skipped heading level: h${prevLevel} → h${level}`);
    }
    prevLevel = level;
  });

  const h1Count = headings.filter(h => h.level === 1).length;
  if (h1Count === 0) headingIssues.push('No H1 tag found');
  if (h1Count > 1) headingIssues.push(`Multiple H1 tags found (${h1Count})`);

  // Paragraph analysis
  const paragraphs = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10) {
      paragraphs.push({ length: text.length, wordCount: text.split(/\s+/).length });
    }
  });

  // List analysis
  const lists = { ordered: $('ol').length, unordered: $('ul').length, definition: $('dl').length };

  // Tables
  const tables = [];
  $('table').each((_, el) => {
    const rows = $(el).find('tr').length;
    const cols = $(el).find('tr:first-child th, tr:first-child td').length;
    const hasHeader = $(el).find('thead').length > 0 || $(el).find('th').length > 0;
    tables.push({ rows, cols, hasHeader });
  });

  // Forms
  const forms = [];
  $('form').each((_, el) => {
    const $form = $(el);
    const inputs = $form.find('input, select, textarea').length;
    const action = $form.attr('action') || '';
    const method = $form.attr('method') || 'GET';
    forms.push({ action: action.substring(0, 200), method, inputCount: inputs });
  });

  // Iframes
  const iframes = [];
  $('iframe').each((_, el) => {
    iframes.push({
      src: $(el).attr('src')?.substring(0, 300) || '',
      title: $(el).attr('title') || '',
      sandbox: $(el).attr('sandbox') || null,
    });
  });

  return {
    headings,
    headingIssues,
    paragraphCount: paragraphs.length,
    avgParagraphLength: paragraphs.length > 0 ? Number((paragraphs.reduce((s, p) => s + p.wordCount, 0) / paragraphs.length).toFixed(1)) : 0,
    lists,
    tables,
    forms,
    iframes: iframes.slice(0, 20),
    semanticElements: {
      article: $('article').length,
      section: $('section').length,
      nav: $('nav').length,
      aside: $('aside').length,
      header: $('header').length,
      footer: $('footer').length,
      main: $('main').length,
      figure: $('figure').length,
      figcaption: $('figcaption').length,
      details: $('details').length,
      summary: $('summary').length,
      mark: $('mark').length,
      time: $('time').length,
    },
  };
}

// ─── 6. Duplicate Content Detection ───

function detectDuplicateContent(text) {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  const seen = new Map();
  const duplicates = [];

  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(normalized)) {
      seen.set(normalized, seen.get(normalized) + 1);
    } else {
      seen.set(normalized, 1);
    }
  }

  for (const [sentence, count] of seen) {
    if (count > 1) {
      duplicates.push({ text: sentence.substring(0, 200), occurrences: count });
    }
  }

  // Content fingerprint (for cross-page comparison)
  const words = tokenize(text);
  const fingerprint = simhash(words);

  return {
    totalSentences: sentences.length,
    duplicateSentences: duplicates.length,
    duplicateDetails: duplicates.slice(0, 20).sort((a, b) => b.occurrences - a.occurrences),
    contentFingerprint: fingerprint,
    uniquenessScore: sentences.length > 0 ? Number((((sentences.length - duplicates.reduce((s, d) => s + d.occurrences - 1, 0)) / sentences.length) * 100).toFixed(1)) : 100,
  };
}

// Simple SimHash for content fingerprinting
function simhash(words) {
  const bits = 64;
  const v = new Array(bits).fill(0);

  for (const word of words) {
    // Generate two independent 32-bit hashes for 64-bit fingerprint
    let h1 = 0, h2 = 0x9e3779b9;
    for (let i = 0; i < word.length; i++) {
      h1 = ((h1 << 5) - h1 + word.charCodeAt(i)) | 0;
      h2 = ((h2 << 7) ^ h2 ^ word.charCodeAt(i)) | 0;
    }
    for (let i = 0; i < 32; i++) {
      if ((h1 >> i) & 1) v[i]++; else v[i]--;
    }
    for (let i = 0; i < 32; i++) {
      if ((h2 >> i) & 1) v[32 + i]++; else v[32 + i]--;
    }
  }

  let fingerprint = '';
  for (let i = 0; i < bits; i++) {
    fingerprint += v[i] > 0 ? '1' : '0';
  }
  return fingerprint;
}

// ─── Main Export ───

export async function analyzeContent(html, baseUrl, options = {}) {
  const visibleText = extractVisibleText(cheerio.load(html));

  const result = {
    keywordDensity: analyzeKeywordDensity(visibleText),
    readability: analyzeReadability(visibleText),
    imageAudit: auditImages(html, baseUrl),
    contentStructure: analyzeContentStructure(html),
    duplicateContent: detectDuplicateContent(visibleText),
    brokenLinks: null,
  };

  // Broken link check is expensive - only if requested
  if (options.checkBrokenLinks) {
    result.brokenLinks = await checkBrokenLinks(html, baseUrl, options.onProgress);
  }

  return result;
}
