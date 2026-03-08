/**
 * Data Extractor Service — ELITE Edition
 * Extracts absolutely everything possible from parsed HTML using Cheerio:
 * structured data, leaked/sensitive data, scripts, comments, security info,
 * RSS feeds, API endpoints, color palette, fonts, pricing, reviews, FAQs,
 * navigation structure, breadcrumbs, page fingerprint, and more
 */
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { detectTechStack } from './techDetector.js';

/**
 * Extract all data from HTML content
 */
export function extractPageData(html, pageUrl, headers = {}) {
  const $ = cheerio.load(html);
  const baseUrl = new URL(pageUrl);

  const data = {
    title: extractTitle($),
    metaDescription: extractMetaDescription($),
    headings: extractHeadings($),
    paragraphs: extractParagraphs($),
    linksInternal: extractLinks($, baseUrl, 'internal'),
    linksExternal: extractLinks($, baseUrl, 'external'),
    images: extractImages($, baseUrl),
    emails: extractEmails($, html),
    phones: extractPhones($, html),
    socialLinks: extractSocialLinks($, html),
    contactInfo: extractContactInfo($, html),
    metadata: extractMetadata($, pageUrl),
    techStack: detectTechStack(html, headers),
    tablesData: extractTables($),
    formsData: extractForms($, baseUrl),
    wordCount: countWords($),
    // ─── Advanced extractions ───
    scripts: extractScripts($, baseUrl),
    stylesheets: extractStylesheets($, baseUrl),
    comments: extractComments(html),
    leakedData: extractLeakedData($, html),
    securityInfo: extractSecurityInfo(headers, $),
    hiddenFields: extractHiddenFields($),
    iframes: extractIframes($, baseUrl),
    downloads: extractDownloadables($, baseUrl),
    videos: extractVideos($, baseUrl),
    // ─── NEW: Performance & Quality Metrics ───
    performanceMetrics: extractPerformanceMetrics($, html, headers),
    accessibilityScore: calculateAccessibilityScore($),
    contentQuality: analyzeContentQuality($, html),
    // ─── NEW: Elite Extraction Categories ───
    rssFeeds: extractRSSFeeds($, baseUrl),
    apiEndpoints: extractAPIEndpoints($, html, baseUrl),
    colorPalette: extractColorPalette($, html),
    fontInfo: extractFontInfo($, html),
    pricing: extractPricing($),
    reviews: extractReviews($),
    faqs: extractFAQs($),
    breadcrumbs: extractBreadcrumbs($),
    navigation: extractNavigationStructure($, baseUrl),
    openAPIs: extractOpenAPIs($, html, baseUrl),
    pageFingerprint: generatePageFingerprint(html),
    languageInfo: detectLanguage($, html),
    copyright: extractCopyright($, html),
    schemaOrg: extractSchemaOrg($),
    microdata: extractMicrodata($),
    linkRelations: extractLinkRelations($, baseUrl),
    responseHeaders: analyzeResponseHeaders(headers),
  };

  // Generate suggestions based on all extracted data
  data.suggestions = generateSuggestions($, data, pageUrl);

  // Calculate SEO score
  data.seoScore = calculateSEOScore($, data);

  return data;
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

  const addImage = (src, alt, width, height, source) => {
    if (!src) return;
    // Skip tiny inline SVGs (but keep larger ones)
    if (src.startsWith('data:image/svg') && src.length < 200) return;
    // Skip tiny base64 placeholders (1x1 gif, transparent png)
    if (src.startsWith('data:image/gif;base64,R0lGOD')) return;
    if (src.startsWith('data:image/png;base64,iVBOR') && src.length < 200) return;

    let absoluteSrc;
    try {
      absoluteSrc = new URL(src, baseUrl.origin).href;
    } catch {
      absoluteSrc = src;
    }

    // Skip tracking pixels and tiny spacers
    if (absoluteSrc.includes('1x1') || absoluteSrc.includes('pixel.') || absoluteSrc.includes('/spacer.')) return;
    // Skip common tracking/analytics images
    if (absoluteSrc.includes('facebook.com/tr') || absoluteSrc.includes('google-analytics.com') || absoluteSrc.includes('doubleclick.net')) return;

    if (seen.has(absoluteSrc)) return;
    seen.add(absoluteSrc);

    images.push({
      src: absoluteSrc,
      alt: alt || null,
      width: width || null,
      height: height || null,
      source: source || 'img',
    });
  };

  // 1. Standard <img> tags — check multiple src attributes (handles lazy loading)
  const lazyAttrs = ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-image',
    'data-bg', 'data-lazy', 'data-fallback-src', 'data-hi-res-src',
    'data-nimg', 'data-ll-status'];

  $('img').each((_, el) => {
    const alt = $(el).attr('alt')?.trim();
    const width = $(el).attr('width');
    const height = $(el).attr('height');
    let found = false;

    // Try each src attribute
    for (const attr of lazyAttrs) {
      const val = $(el).attr(attr);
      if (val && val.length > 5 && !val.startsWith('data:image/gif;base64,R0lGOD') && !(val.startsWith('data:') && val.length < 200)) {
        addImage(val, alt, width, height, 'img');
        found = true;
        break;
      }
    }

    // If no standard src found, check srcset as fallback
    if (!found) {
      const srcset = $(el).attr('srcset');
      if (srcset) {
        // Take the highest resolution image from srcset
        const parts = srcset.split(',').map(s => s.trim());
        const bestPart = parts[parts.length - 1]; // last is usually highest res
        const url = bestPart?.split(/\s+/)[0];
        if (url && url.length > 5) {
          addImage(url, alt, width, height, 'srcset');
          found = true;
        }
      }
    }

    // Also add all srcset variants as separate images
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const parts = srcset.split(',');
      for (const part of parts) {
        const url = part.trim().split(/\s+/)[0];
        if (url && url.length > 5) {
          addImage(url, alt, width, height, 'srcset');
        }
      }
    }
  });

  // 2. <picture> → <source> elements
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const parts = srcset.split(',');
      for (const part of parts) {
        const url = part.trim().split(/\s+/)[0];
        if (url && url.length > 5) {
          addImage(url, null, null, null, 'picture');
        }
      }
    }
  });

  // 3. CSS background images from inline styles
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    if (!style) return;
    // Match all url() in style (could have multiple backgrounds)
    const bgRegex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
    let match;
    while ((match = bgRegex.exec(style)) !== null) {
      if (match[1] && match[1].length > 5 && !match[1].startsWith('data:')) {
        addImage(match[1], null, null, null, 'css-bg');
      }
    }
  });

  // 4. Open Graph & Twitter Card images (meta tags)
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) addImage(ogImage, 'Open Graph Image', null, null, 'og:image');

  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage) addImage(twitterImage, 'Twitter Card Image', null, null, 'twitter:image');

  // 5. <figure> images that might use non-standard attributes
  $('figure img, figure [data-src]').each((_, el) => {
    const src = $(el).attr('data-src') || $(el).attr('src');
    if (src) {
      const caption = $(el).closest('figure').find('figcaption').text()?.trim();
      addImage(src, caption || $(el).attr('alt')?.trim(), null, null, 'figure');
    }
  });

  // 6. Link tags for icons/apple-touch-icon (put these last, they're less important)
  $('link[rel*="icon"], link[rel="apple-touch-icon"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) addImage(href, 'Site Icon', null, null, 'favicon');
  });

  // 7. Next.js Image component — data-nimg attribute or /_next/image paths
  $('[data-nimg]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) addImage(src, $(el).attr('alt')?.trim(), $(el).attr('width'), $(el).attr('height'), 'next-image');
  });

  // 8. Divs/sections with background-image via class (common in Tailwind/portfolio sites)
  // Extract from <style> blocks or embedded CSS
  const styleContent = [];
  $('style').each((_, el) => {
    styleContent.push($(el).html() || '');
  });
  const allCSS = styleContent.join('\n');
  const cssUrlRegex = /url\(\s*['"]?([^'")]+\.(?:jpg|jpeg|png|gif|webp|avif|svg)(?:\?[^'")\s]*)?)['"]?\s*\)/gi;
  let cssMatch;
  while ((cssMatch = cssUrlRegex.exec(allCSS)) !== null) {
    if (cssMatch[1] && cssMatch[1].length > 5 && !cssMatch[1].startsWith('data:')) {
      addImage(cssMatch[1], null, null, null, 'css-embedded');
    }
  }

  // 9. Video poster images
  $('video[poster]').each((_, el) => {
    const poster = $(el).attr('poster');
    if (poster) addImage(poster, 'Video Poster', null, null, 'video-poster');
  });

  // 10. Any element with role="img" (accessibility pattern)
  $('[role="img"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const bgMatch = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    if (bgMatch) addImage(bgMatch[1], $(el).attr('aria-label'), null, null, 'role-img');
  });

  // Sort: put content images first, favicons last
  const sortOrder = { 'img': 0, 'next-image': 0, 'srcset': 1, 'picture': 1, 'figure': 1, 'css-bg': 2, 'css-embedded': 2, 'role-img': 2, 'video-poster': 2, 'og:image': 3, 'twitter:image': 3, 'favicon': 4 };
  images.sort((a, b) => (sortOrder[a.source] || 3) - (sortOrder[b.source] || 3));

  return images.slice(0, 300);
}

function extractEmails($, html) {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

  const emails = new Set();

  // 1. From mailto: links (most reliable)
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (email && email.includes('@') && email.includes('.')) {
        emails.add(email);
      }
    }
  });

  // 2. From visible text (strip scripts/styles first)
  let visibleText = html;
  visibleText = visibleText.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  visibleText = visibleText.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  visibleText = visibleText.replace(/<[^>]+>/g, ' ');
  visibleText = visibleText.replace(/&nbsp;/g, ' ').replace(/&#64;/g, '@').replace(/&amp;/g, '&');
  // Also decode common obfuscation: [at] -> @, [dot] -> .
  visibleText = visibleText.replace(/\s*\[at\]\s*/gi, '@');
  visibleText = visibleText.replace(/\s*\(at\)\s*/gi, '@');
  visibleText = visibleText.replace(/\s*\[dot\]\s*/gi, '.');
  visibleText = visibleText.replace(/\s*\(dot\)\s*/gi, '.');

  const textMatches = visibleText.match(emailRegex) || [];
  textMatches.forEach(e => emails.add(e.toLowerCase()));

  // 3. From href attributes and data attributes
  $('[href], [data-email], [data-contact]').each((_, el) => {
    const val = $(el).attr('href') || $(el).attr('data-email') || $(el).attr('data-contact') || '';
    const matches = val.match(emailRegex);
    if (matches) matches.forEach(e => emails.add(e.toLowerCase()));
  });

  // 4. From JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const text = $(el).html() || '';
      const matches = text.match(emailRegex);
      if (matches) matches.forEach(e => emails.add(e.toLowerCase()));
    } catch {}
  });

  // Filter out false positives
  return [...emails].filter(e =>
    !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif') &&
    !e.endsWith('.svg') && !e.endsWith('.webp') && !e.endsWith('.css') &&
    !e.endsWith('.js') && !e.includes('example.com') && !e.includes('sentry') &&
    !e.includes('webpack') && !e.includes('localhost') &&
    !e.startsWith('0x') && e.length < 100
  ).slice(0, 100);
}

function extractPhones($, html) {
  // Smart phone extraction — avoids CSS numbers, JS values, timestamps, etc.
  const matches = new Set();

  // 1. Extract from tel: links (most reliable source)
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const phone = href.replace('tel:', '').replace(/[^0-9+\-() .]/g, '').trim();
      const digits = phone.replace(/\D/g, '');
      if (digits.length >= 7 && digits.length <= 15) {
        matches.add(phone);
      }
    }
  });

  // 2. Also check raw HTML for tel: hrefs cheerio might miss
  const telRegex = /tel:([^"'\s<>]+)/g;
  let m;
  while ((m = telRegex.exec(html)) !== null) {
    const cleaned = m[1].replace(/[^0-9+\-() .]/g, '').trim();
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) {
      matches.add(cleaned);
    }
  }

  // 3. Extract visible text only (strip scripts, styles, and tags)
  let visibleText = html;
  visibleText = visibleText.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  visibleText = visibleText.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  visibleText = visibleText.replace(/<[^>]+>/g, ' ');
  visibleText = visibleText.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

  // 4. Phone patterns that REQUIRE formatting separators
  const phonePatterns = [
    // International: +1 (234) 567-8901, +91-9876543210, +44 20 7946 0958
    /\+\d{1,3}[-\s.]?\(?\d{1,4}\)?[-\s.]?\d{2,4}[-\s.]?\d{2,4}[-\s.]?\d{0,4}/g,
    // US/CA with parens: (234) 567-8901
    /\(\d{3}\)\s?\d{3}[-.\s]\d{4}/g,
    // With explicit separators: 234-567-8901, 234.567.8901, 234 567 8901
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
    // Longer with country: 1-234-567-8901
    /\b1[-.\s]\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
    // UK style: 020 7946 0958
    /\b0\d{2,4}[-\s]\d{3,4}[-\s]?\d{3,4}\b/g,
  ];

  for (const pattern of phonePatterns) {
    const found = visibleText.match(pattern) || [];
    for (const p of found) {
      const cleaned = p.trim();
      const digits = cleaned.replace(/\D/g, '');
      // Must be 7-15 digits (valid phone range)
      if (digits.length < 7 || digits.length > 15) continue;
      // Reject decimal numbers (CSS values like 1.7999999999)
      if (/^\d+\.\d+$/.test(cleaned)) continue;
      // Reject if all leading zeros (like 0000003264)
      if (/^0{4,}/.test(digits)) continue;
      // Reject IP addresses
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleaned)) continue;
      // Must have at least one real separator (not just digits)
      if (!/[-\s.()]/.test(cleaned)) continue;
      matches.add(cleaned);
    }
  }

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

/**
 * Extract structured contact information from page
 * Looks for addresses, names, locations in contact/about sections and structured data
 */
function extractContactInfo($, html) {
  const contact = {
    addresses: [],
    names: [],
    locations: [],
    websites: [],
    roles: [],
    raw: [],
  };

  // 1. From JSON-LD structured data (most reliable)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.name) contact.names.push(item.name);
        if (item.jobTitle) contact.roles.push(item.jobTitle);
        if (item.url) contact.websites.push(item.url);
        if (item.email) contact.raw.push({ type: 'email', value: item.email });
        if (item.telephone) contact.raw.push({ type: 'phone', value: item.telephone });

        // Address from structured data
        const addr = item.address;
        if (addr) {
          if (typeof addr === 'string') {
            contact.addresses.push(addr);
          } else if (addr.streetAddress || addr.addressLocality) {
            const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry].filter(Boolean);
            contact.addresses.push(parts.join(', '));
          }
        }

        if (item.location) {
          if (typeof item.location === 'string') contact.locations.push(item.location);
          else if (item.location.name) contact.locations.push(item.location.name);
        }

        // Check nested items (e.g., @graph)
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          for (const sub of item['@graph']) {
            if (sub.name && sub['@type']?.match?.(/Person|Organization/i)) contact.names.push(sub.name);
            if (sub.jobTitle) contact.roles.push(sub.jobTitle);
            if (sub.email) contact.raw.push({ type: 'email', value: sub.email });
            if (sub.telephone) contact.raw.push({ type: 'phone', value: sub.telephone });
          }
        }
      }
    } catch {}
  });

  // 2. Look for contact sections by common selectors and text patterns
  const contactSelectors = [
    '#contact', '#about', '#footer', '.contact', '.about', '.footer',
    '[data-section="contact"]', '[data-section="about"]',
    'section:has(h2:contains("Contact"))', 'section:has(h2:contains("About"))',
    'section:has(h2:contains("Get in Touch"))', 'section:has(h2:contains("Reach"))',
    'footer', 'address',
  ];

  for (const selector of contactSelectors) {
    try {
      $(selector).each((_, section) => {
        const text = $(section).text().trim();
        if (!text || text.length > 5000) return;

        // Look for address patterns in contact sections
        const addressPatterns = [
          // US address: 123 Main St, City, ST 12345
          /\d{1,5}\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way)[.,]?\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/gi,
          // City, State pattern
          /[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+,\s*(?:India|USA|UK|Canada|Australia|Germany|France)/gi,
          // Indian cities with pin codes
          /[A-Z][a-zA-Z\s]+[-,]\s*\d{6}/g,
        ];

        for (const pattern of addressPatterns) {
          const matches = text.match(pattern);
          if (matches) {
            matches.forEach(m => {
              if (m.trim().length > 10 && !contact.addresses.includes(m.trim())) {
                contact.addresses.push(m.trim());
              }
            });
          }
        }
      });
    } catch {}
  }

  // 3. From <address> HTML elements
  $('address').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 5 && text.length < 500) {
      contact.addresses.push(text);
    }
  });

  // 4. Person/author name from meta tags
  const author = $('meta[name="author"]').attr('content')?.trim();
  if (author) contact.names.push(author);

  // 5. From vCard hCard microformat
  $('.vcard, .h-card').each((_, el) => {
    const fn = $(el).find('.fn, .p-name').text()?.trim();
    const role = $(el).find('.role, .p-job-title').text()?.trim();
    const adr = $(el).find('.adr, .p-adr').text()?.trim();
    if (fn) contact.names.push(fn);
    if (role) contact.roles.push(role);
    if (adr) contact.addresses.push(adr);
  });

  // Deduplicate
  contact.names = [...new Set(contact.names)].slice(0, 10);
  contact.addresses = [...new Set(contact.addresses)].slice(0, 10);
  contact.locations = [...new Set(contact.locations)].slice(0, 10);
  contact.websites = [...new Set(contact.websites)].slice(0, 10);
  contact.roles = [...new Set(contact.roles)].slice(0, 10);

  return contact;
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
  // Remove script and style content first
  const $clone = $.root().clone();
  $clone.find('script, style, noscript, svg, code, pre').remove();
  
  // Get text from body, or whole document if no body
  let text = $clone.find('body').text() || $clone.text();
  
  // Clean up whitespace and normalize
  text = text
    .replace(/[\r\n\t]+/g, ' ')  // Replace newlines/tabs with spaces
    .replace(/\s+/g, ' ')         // Collapse multiple spaces
    .trim();
  
  if (!text) return 0;
  
  // Split by whitespace and filter out empty/short tokens
  const words = text.split(/\s+/).filter(word => {
    // Must be at least 1 character and contain at least one letter
    return word.length >= 1 && /[a-zA-Z]/.test(word);
  });
  
  return words.length;
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

  // ─── Detect code-hosting sites (GitHub, GitLab, etc.) ──────
  // On these sites, most "leaked" data is user-generated code content, not real vulnerabilities
  const pageTitle = $('title').text().toLowerCase();
  const metaOgSite = $('meta[property="og:site_name"]').attr('content') || '';
  const isCodeHostingSite = [
    'github', 'gitlab', 'bitbucket', 'codepen', 'jsfiddle',
    'codesandbox', 'replit', 'stackblitz', 'gist', 'pastebin',
    'npmjs', 'pypi', 'stackoverflow', 'stack overflow',
  ].some(site => pageTitle.includes(site) || metaOgSite.toLowerCase().includes(site));

  // ─── Collect text inside <code>, <pre>, <textarea> elements ──────
  // Matches found inside these are almost always examples/docs, not real leaks
  const codeBlockTexts = new Set();
  $('code, pre, textarea, .highlight, .code-block, [class*="language-"], [class*="CodeMirror"], .blob-code').each((_, el) => {
    const txt = $(el).text();
    if (txt.length > 5) codeBlockTexts.add(txt);
  });

  // Check if a match appears inside a code block
  const isInsideCodeBlock = (matchStr) => {
    for (const block of codeBlockTexts) {
      if (block.includes(matchStr)) return true;
    }
    return false;
  };

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
      'class="', "class='",
      // Additional false-positive context markers
      'tutorial', 'readme', 'documentation', 'docs',
      'snippet', 'code-block', 'highlight', 'syntax',
      '<code', '</code', '<pre', '</pre',
    ];
    return falseContexts.some(ctx => context.includes(ctx));
  };

  // ─── Helper: get source location info from match position ──────
  const getSourceInfo = (html, pos, matchVal) => {
    // Get 120 chars of surrounding context
    const ctxStart = Math.max(0, pos - 120);
    const ctxEnd = Math.min(html.length, pos + matchVal.length + 120);
    const snippet = html.substring(ctxStart, ctxEnd).replace(/\s+/g, ' ').trim();

    // Determine source type by looking at what's before the match
    const before = html.substring(Math.max(0, pos - 2000), pos).toLowerCase();

    // Check if inside a <script src="..."> tag (external script)
    const lastScriptOpen = before.lastIndexOf('<script');
    const lastScriptClose = before.lastIndexOf('</script');
    const isInScript = lastScriptOpen > lastScriptClose;

    // Try to find the src of the enclosing script tag
    let scriptSrc = null;
    if (isInScript) {
      const scriptTag = html.substring(html.lastIndexOf('<script', pos), html.indexOf('>', html.lastIndexOf('<script', pos)) + 1);
      const srcMatch = scriptTag.match(/src=["']([^"']+)["']/i);
      if (srcMatch) scriptSrc = srcMatch[1];
    }

    // Detect if inside an HTML attribute
    const attrMatch = html.substring(Math.max(0, pos - 200), pos).match(/\s([\w-]+)=["'][^"']*$/);
    const attrName = attrMatch ? attrMatch[1] : null;

    // Count which script block number (for inline scripts)
    let scriptIndex = null;
    if (isInScript && !scriptSrc) {
      const scriptsBefore = (html.substring(0, pos).match(/<script/gi) || []).length;
      scriptIndex = scriptsBefore;
    }

    let source = 'HTML';
    let location = '';
    if (scriptSrc) {
      source = 'External Script';
      location = scriptSrc;
    } else if (isInScript) {
      source = 'Inline Script';
      location = `Inline <script> #${scriptIndex}`;
    } else if (attrName) {
      source = 'HTML Attribute';
      location = `attribute: ${attrName}`;
    } else {
      source = 'Page HTML';
      location = 'Page body/HTML';
    }

    return { source, location, snippet };
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

  // Track seen values to avoid showing same key many times
  const seenApiKeys = new Set();

  for (const pat of apiKeyPatterns) {
    let match;
    const re = new RegExp(pat.re.source, pat.re.flags);
    while ((match = re.exec(fullText)) !== null) {
      // Skip if inside code blocks (example code on docs/code-hosting sites)
      if (isInsideCodeBlock(match[0])) continue;
      // On code-hosting sites, all API key matches are from user code
      if (isCodeHostingSite) continue;
      // Validate it's not in a false-positive context
      if (!isLikelyFalsePositive(match[0], fullText, match.index)) {
        // Deduplicate: skip if we've already seen this exact key value
        if (seenApiKeys.has(match[0])) continue;
        seenApiKeys.add(match[0]);

        const srcInfo = getSourceInfo(fullText, match.index, match[0]);
        leaked.apiKeys.push({
          type: pat.name,
          value: match[0],
          confidence: pat.confidence,
          source: srcInfo.source,
          location: srcInfo.location,
          snippet: srcInfo.snippet,
        });
      }
    }
  }

  // ─── AWS Keys (very specific prefixes) ──────
  const seenAwsKeys = new Set();
  const awsAccessKeyRe = /(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])/g;
  let awsM2;
  while ((awsM2 = awsAccessKeyRe.exec(fullText)) !== null) {
    const k = awsM2[0];
    if (seenAwsKeys.has(k)) continue;
    seenAwsKeys.add(k);
    const srcInfo = getSourceInfo(fullText, awsM2.index, k);
    leaked.awsKeys.push({ type: 'AWS Access Key ID', value: k, confidence: 'high', source: srcInfo.source, location: srcInfo.location, snippet: srcInfo.snippet });
  }

  const awsSecretRe = /(?:aws_secret_access_key|aws_secret)\s*[:=]\s*['"]([A-Za-z0-9\/+=]{40})['"]/gi;
  let awsM;
  while ((awsM = awsSecretRe.exec(fullText)) !== null) {
    if (seenAwsKeys.has(awsM[1])) continue;
    seenAwsKeys.add(awsM[1]);
    const srcInfo = getSourceInfo(fullText, awsM.index, awsM[0]);
    leaked.awsKeys.push({ type: 'AWS Secret Access Key', value: awsM[1], confidence: 'high', source: srcInfo.source, location: srcInfo.location, snippet: srcInfo.snippet });
  }

  // ─── JWT Tokens (must have valid base64url segments) ──────
  // On code-hosting sites, skip JWTs entirely — they're from displayed user code
  if (!isCodeHostingSite) {
    const jwtRegex = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
    let jwtM;
    while ((jwtM = jwtRegex.exec(fullText)) !== null) {
      const token = jwtM[0];
      // Skip JWTs found inside inline <script> tags — these are operational (session tokens)
      const isInScript = (() => {
        const before = fullText.substring(Math.max(0, jwtM.index - 5000), jwtM.index);
        const lastScriptOpen = before.lastIndexOf('<script');
        const lastScriptClose = before.lastIndexOf('</script');
        return lastScriptOpen > lastScriptClose;
      })();
      if (isInScript) continue;

      // Skip JWTs inside code blocks
      if (isInsideCodeBlock(token)) continue;

      // Skip if in a false-positive context
      if (isLikelyFalsePositive(token, fullText, jwtM.index)) continue;

      // Validate: try to decode header to check it's a real JWT
      try {
        const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
        if (header.alg || header.typ) {
          leaked.jwtTokens.push({
            value: token,
            header: header,
            confidence: 'medium',
          });
        }
      } catch {
        // Not a valid JWT, skip
      }
    }
  }

  // ─── Passwords (only in assignment contexts with actual values) ──────
  const passRe = /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{4,50})['"]/gi;
  let passM;
  while ((passM = passRe.exec(fullText)) !== null) {
    const val = passM[1];
    // Skip on code-hosting sites (all passwords are from user code)
    if (isCodeHostingSite) continue;
    // Skip if inside code blocks
    if (isInsideCodeBlock(passM[0])) continue;
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
        value: passM[0],
        confidence: 'medium',
      });
    }
  }

  // ─── Database URLs (very specific protocol prefixes) ──────
  const dbUrlRegex = /(?:mongodb(?:\+srv)?|mysql|postgresql|postgres|redis|amqp|mssql):\/\/[^\s'"<>]{10,200}/gi;
  const dbUrls = fullText.match(dbUrlRegex);
  if (dbUrls) {
    // Filter out placeholder/example/localhost DB URLs
    const placeholderCreds = [
      'user:password', 'username:password', 'root:password', 'root:root',
      'admin:admin', 'admin:password', 'user:pass', 'dbuser:dbpass',
      'myuser:mypass', 'your_username', 'your-username', '<username>',
      '%s:%s', '${', 'example', 'sample', 'test',
    ];
    const placeholderHosts = [
      'localhost', '127.0.0.1', '0.0.0.0', 'example.com', 'your-host',
      'your_host', 'myhost', '<host>', 'hostname', 'db-host',
    ];

    const filtered = [...new Set(dbUrls)].filter(u => {
      const lower = u.toLowerCase();
      // Skip placeholder credentials
      if (placeholderCreds.some(p => lower.includes(p))) return false;
      // Skip localhost/example hostnames
      if (placeholderHosts.some(h => lower.includes(h))) return false;
      // Skip URLs found inside code blocks
      if (isInsideCodeBlock(u)) return false;
      // On code-hosting sites, all DB URLs are from displayed code
      if (isCodeHostingSite) return false;
      return true;
    });

    leaked.databaseUrls = filtered.map(u => ({
      value: u,
      protocol: u.split('://')[0],
      confidence: 'high',
    }));
  }

  // ─── S3 Buckets ──────────────────────────────
  if (!isCodeHostingSite) {
    const s3Regex = /(?:https?:\/\/)?[a-z0-9][a-z0-9\-]{2,62}\.s3[.\-](?:us|eu|ap|sa|ca|me|af)[a-z0-9\-]*\.amazonaws\.com/gi;
    const s3alt = /s3:\/\/[a-z0-9][a-z0-9.\-]{2,62}/gi;
    const s3Matches = [...(fullText.match(s3Regex) || []), ...(fullText.match(s3alt) || [])];
    if (s3Matches.length) {
      leaked.s3Buckets = [...new Set(s3Matches)].filter(b => !isInsideCodeBlock(b)).slice(0, 10).map(b => ({
        value: b,
        confidence: 'high',
      }));
    }
  }

  // ─── Environment variable references in client-side code ──────
  // Only in <script> tags (not type=application/json which is data, not code)
  // Skip entirely on code-hosting sites — env var refs are from user code
  if (!isCodeHostingSite) {
    const scriptContent = [];
    $('script:not([src]):not([type="application/json"]):not([type="application/ld+json"])').each((_, el) => {
      const content = $(el).html();
      if (content) scriptContent.push(content);
    });
    const scriptText = scriptContent.join('\n');

    const envRegex = /process\.env\.([A-Z_][A-Z0-9_]{2,})/g;
    let envM;
    while ((envM = envRegex.exec(scriptText)) !== null) {
      // Skip common non-sensitive env vars
      const skipEnvVars = [
        'NODE_ENV', 'PORT', 'HOST', 'HOSTNAME', 'HOME', 'PWD', 'PATH',
        'LANG', 'SHELL', 'TERM', 'USER', 'LOGNAME', 'TZ', 'CI',
        'NEXT_PUBLIC_', 'REACT_APP_', 'VITE_', 'NUXT_PUBLIC_',
      ];
      const varName = envM[1];
      if (skipEnvVars.some(s => varName === s || varName.startsWith(s))) continue;
      leaked.envVars.push(varName);
    }
    leaked.envVars = [...new Set(leaked.envVars)].slice(0, 30);
  }

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

/* ═══════════════════════════════════════════════════
   PERFORMANCE METRICS — Page load & optimization analysis
   ═══════════════════════════════════════════════════ */

function extractPerformanceMetrics($, html, headers = {}) {
  const metrics = {
    // Size metrics
    htmlSize: html.length,
    htmlSizeKB: Math.round(html.length / 1024 * 100) / 100,
    
    // Resource counts
    totalScripts: $('script').length,
    externalScripts: $('script[src]').length,
    inlineScripts: $('script:not([src])').length,
    asyncScripts: $('script[async]').length,
    deferScripts: $('script[defer]').length,
    renderBlockingScripts: $('script[src]:not([async]):not([defer])').length,
    
    totalStylesheets: $('link[rel="stylesheet"]').length,
    inlineStyles: $('style').length,
    inlineStyleAttributes: $('[style]').length,
    
    totalImages: $('img').length,
    lazyImages: $('img[loading="lazy"]').length,
    imagesWithDimensions: $('img[width][height]').length,
    
    totalIframes: $('iframe').length,
    
    // DOM complexity
    domElements: $('*').length,
    domDepth: calculateDOMDepth($),
    
    // Fonts
    fontFaces: (html.match(/@font-face/gi) || []).length,
    googleFonts: $('link[href*="fonts.googleapis.com"]').length,
    
    // Preload/prefetch
    preloadLinks: $('link[rel="preload"]').length,
    prefetchLinks: $('link[rel="prefetch"]').length,
    preconnectLinks: $('link[rel="preconnect"]').length,
    dnsPrefetch: $('link[rel="dns-prefetch"]').length,
    
    // Headers
    cacheControl: headers['cache-control'] || null,
    contentEncoding: headers['content-encoding'] || null,
    
    // Estimated scores
    estimatedScore: 0,
    issues: [],
    optimizations: [],
  };

  // Calculate estimated performance score
  let score = 100;
  const issues = [];
  const optimizations = [];

  // HTML size analysis
  if (metrics.htmlSizeKB > 500) {
    score -= 15;
    issues.push({ type: 'size', message: `Large HTML (${metrics.htmlSizeKB}KB)`, impact: 'high' });
  } else if (metrics.htmlSizeKB > 200) {
    score -= 8;
    issues.push({ type: 'size', message: `HTML could be smaller (${metrics.htmlSizeKB}KB)`, impact: 'medium' });
  } else if (metrics.htmlSizeKB < 50) {
    optimizations.push('Compact HTML size');
  }

  // Script analysis
  if (metrics.renderBlockingScripts > 5) {
    score -= 15;
    issues.push({ type: 'scripts', message: `${metrics.renderBlockingScripts} render-blocking scripts`, impact: 'high' });
  } else if (metrics.renderBlockingScripts > 2) {
    score -= 8;
    issues.push({ type: 'scripts', message: `${metrics.renderBlockingScripts} render-blocking scripts`, impact: 'medium' });
  }

  if (metrics.externalScripts > 20) {
    score -= 10;
    issues.push({ type: 'scripts', message: `Too many external scripts (${metrics.externalScripts})`, impact: 'high' });
  }

  if (metrics.asyncScripts > 0 || metrics.deferScripts > 0) {
    optimizations.push(`Using async/defer loading (${metrics.asyncScripts + metrics.deferScripts} scripts)`);
  }

  // Image analysis
  if (metrics.totalImages > 0) {
    const lazyPercentage = (metrics.lazyImages / metrics.totalImages) * 100;
    if (lazyPercentage > 50) {
      optimizations.push(`Images use lazy loading (${Math.round(lazyPercentage)}%)`);
    } else if (metrics.totalImages > 5 && lazyPercentage < 30) {
      score -= 5;
      issues.push({ type: 'images', message: 'Most images not lazy-loaded', impact: 'medium' });
    }

    const dimensionPercentage = (metrics.imagesWithDimensions / metrics.totalImages) * 100;
    if (dimensionPercentage > 80) {
      optimizations.push('Images have explicit dimensions');
    } else if (dimensionPercentage < 30) {
      score -= 5;
      issues.push({ type: 'images', message: 'Images missing width/height (causes layout shift)', impact: 'medium' });
    }
  }

  // DOM complexity
  if (metrics.domElements > 3000) {
    score -= 10;
    issues.push({ type: 'dom', message: `Very large DOM (${metrics.domElements} elements)`, impact: 'high' });
  } else if (metrics.domElements > 1500) {
    score -= 5;
    issues.push({ type: 'dom', message: `Large DOM (${metrics.domElements} elements)`, impact: 'medium' });
  } else if (metrics.domElements < 500) {
    optimizations.push('Lean DOM structure');
  }

  if (metrics.domDepth > 20) {
    score -= 5;
    issues.push({ type: 'dom', message: `Deep DOM nesting (${metrics.domDepth} levels)`, impact: 'medium' });
  }

  // Resource hints
  if (metrics.preloadLinks > 0 || metrics.preconnectLinks > 0) {
    optimizations.push('Uses resource hints (preload/preconnect)');
  }

  // Caching
  if (metrics.cacheControl && metrics.cacheControl.includes('max-age')) {
    optimizations.push('Has cache-control headers');
  }

  // Compression
  if (metrics.contentEncoding && (metrics.contentEncoding.includes('gzip') || metrics.contentEncoding.includes('br'))) {
    optimizations.push(`Compression enabled (${metrics.contentEncoding})`);
  }

  // Inline styles penalty
  if (metrics.inlineStyleAttributes > 50) {
    score -= 5;
    issues.push({ type: 'styles', message: `Many inline styles (${metrics.inlineStyleAttributes})`, impact: 'low' });
  }

  metrics.estimatedScore = Math.max(0, Math.min(100, Math.round(score)));
  metrics.issues = issues;
  metrics.optimizations = optimizations;
  metrics.grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  return metrics;
}

function calculateDOMDepth($) {
  let maxDepth = 0;
  function traverse(el, depth) {
    if (depth > maxDepth) maxDepth = depth;
    $(el).children().each((_, child) => traverse(child, depth + 1));
  }
  traverse($('html'), 0);
  return Math.min(maxDepth, 50); // Cap at 50 for performance
}

/* ═══════════════════════════════════════════════════
   ACCESSIBILITY SCORE — WCAG compliance analysis
   ═══════════════════════════════════════════════════ */

function calculateAccessibilityScore($) {
  let score = 100;
  const issues = [];
  const passes = [];

  // ─── Images ───
  const images = $('img');
  const imagesWithAlt = $('img[alt]').length;
  const imagesWithEmptyAlt = $('img[alt=""]').length;
  const totalImages = images.length;
  
  if (totalImages > 0) {
    const missingAlt = totalImages - imagesWithAlt;
    if (missingAlt > 0) {
      const penalty = Math.min(20, missingAlt * 3);
      score -= penalty;
      issues.push({ rule: 'img-alt', message: `${missingAlt} images missing alt attribute`, severity: 'critical', wcag: '1.1.1' });
    } else {
      passes.push({ rule: 'img-alt', message: 'All images have alt attributes' });
    }
  }

  // ─── Page Language ───
  const htmlLang = $('html').attr('lang');
  if (!htmlLang) {
    score -= 10;
    issues.push({ rule: 'html-lang', message: 'Missing lang attribute on <html>', severity: 'critical', wcag: '3.1.1' });
  } else {
    passes.push({ rule: 'html-lang', message: `Page language defined (${htmlLang})` });
  }

  // ─── Page Title ───
  const title = $('title').text().trim();
  if (!title) {
    score -= 10;
    issues.push({ rule: 'page-title', message: 'Missing page title', severity: 'critical', wcag: '2.4.2' });
  } else {
    passes.push({ rule: 'page-title', message: 'Page has a title' });
  }

  // ─── Headings ───
  const h1Count = $('h1').length;
  if (h1Count === 0) {
    score -= 8;
    issues.push({ rule: 'h1-presence', message: 'Missing H1 heading', severity: 'serious', wcag: '1.3.1' });
  } else if (h1Count > 1) {
    score -= 3;
    issues.push({ rule: 'h1-multiple', message: `Multiple H1 headings (${h1Count})`, severity: 'moderate', wcag: '1.3.1' });
  } else {
    passes.push({ rule: 'h1-presence', message: 'Single H1 heading present' });
  }

  // Check heading order
  let lastHeadingLevel = 0;
  let headingSkipFound = false;
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt(el.tagName.replace('H', ''));
    if (level > lastHeadingLevel + 1 && lastHeadingLevel > 0) {
      headingSkipFound = true;
    }
    lastHeadingLevel = level;
  });
  if (headingSkipFound) {
    score -= 5;
    issues.push({ rule: 'heading-order', message: 'Heading levels are skipped', severity: 'moderate', wcag: '1.3.1' });
  }

  // ─── Links ───
  const emptyLinks = $('a:not([href]), a[href=""], a[href="#"]').length;
  if (emptyLinks > 0) {
    score -= Math.min(10, emptyLinks * 2);
    issues.push({ rule: 'link-valid', message: `${emptyLinks} empty or invalid links`, severity: 'moderate', wcag: '2.4.4' });
  }

  const linksWithText = $('a').filter((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr('aria-label');
    const hasImage = $(el).find('img[alt]').length > 0;
    return text || ariaLabel || hasImage;
  }).length;
  const totalLinks = $('a[href]').length;
  if (totalLinks > 0) {
    const linksWithoutText = totalLinks - linksWithText;
    if (linksWithoutText > 0) {
      score -= Math.min(10, linksWithoutText * 2);
      issues.push({ rule: 'link-name', message: `${linksWithoutText} links have no accessible name`, severity: 'serious', wcag: '2.4.4' });
    }
  }

  // ─── Forms ───
  const inputs = $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])');
  const inputsWithLabels = inputs.filter((_, el) => {
    const id = $(el).attr('id');
    const ariaLabel = $(el).attr('aria-label');
    const ariaLabelledby = $(el).attr('aria-labelledby');
    const placeholder = $(el).attr('placeholder');
    const hasLabel = id && $(`label[for="${id}"]`).length > 0;
    return hasLabel || ariaLabel || ariaLabelledby;
  }).length;
  
  if (inputs.length > 0) {
    const unlabeledInputs = inputs.length - inputsWithLabels;
    if (unlabeledInputs > 0) {
      score -= Math.min(15, unlabeledInputs * 3);
      issues.push({ rule: 'input-label', message: `${unlabeledInputs} form inputs without labels`, severity: 'critical', wcag: '1.3.1' });
    } else {
      passes.push({ rule: 'input-label', message: 'All form inputs have labels' });
    }
  }

  // ─── Buttons ───
  const buttonsWithoutText = $('button').filter((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr('aria-label');
    const title = $(el).attr('title');
    return !text && !ariaLabel && !title;
  }).length;
  if (buttonsWithoutText > 0) {
    score -= Math.min(10, buttonsWithoutText * 2);
    issues.push({ rule: 'button-name', message: `${buttonsWithoutText} buttons without accessible name`, severity: 'critical', wcag: '4.1.2' });
  }

  // ─── ARIA ───
  const ariaRoles = $('[role]').length;
  const ariaLabels = $('[aria-label], [aria-labelledby], [aria-describedby]').length;
  if (ariaRoles > 0 || ariaLabels > 0) {
    passes.push({ rule: 'aria-usage', message: `Uses ARIA attributes (${ariaRoles} roles, ${ariaLabels} labels)` });
  }

  // ─── Landmarks ───
  const hasMain = $('main, [role="main"]').length > 0;
  const hasNav = $('nav, [role="navigation"]').length > 0;
  const hasHeader = $('header, [role="banner"]').length > 0;
  const hasFooter = $('footer, [role="contentinfo"]').length > 0;
  
  if (!hasMain) {
    score -= 5;
    issues.push({ rule: 'landmark-main', message: 'Missing main landmark', severity: 'moderate', wcag: '1.3.1' });
  } else {
    passes.push({ rule: 'landmark-main', message: 'Has main landmark' });
  }

  const landmarkCount = [hasMain, hasNav, hasHeader, hasFooter].filter(Boolean).length;
  if (landmarkCount >= 3) {
    passes.push({ rule: 'landmarks', message: 'Good use of landmarks' });
  }

  // ─── Skip Link ───
  const hasSkipLink = $('a[href="#main"], a[href="#content"], a[href="#main-content"], .skip-link, .skip-nav, a:contains("Skip")').first();
  if (hasSkipLink.length > 0) {
    passes.push({ rule: 'skip-link', message: 'Has skip navigation link' });
  } else if ($('nav').length > 0) {
    score -= 3;
    issues.push({ rule: 'skip-link', message: 'Missing skip navigation link', severity: 'moderate', wcag: '2.4.1' });
  }

  // ─── Color Contrast (basic check) ───
  // We can't fully check contrast without rendering, but we can flag potential issues
  const potentialContrastIssues = $('[style*="color"][style*="background"]').length;
  if (potentialContrastIssues > 10) {
    issues.push({ rule: 'color-contrast', message: 'Many inline color styles (verify contrast)', severity: 'needs-review', wcag: '1.4.3' });
  }

  // ─── Focus Management ───
  const tabindexNegative = $('[tabindex="-1"]').length;
  const tabindexPositive = $('[tabindex]').filter((_, el) => {
    const val = parseInt($(el).attr('tabindex'));
    return val > 0;
  }).length;
  
  if (tabindexPositive > 0) {
    score -= 3;
    issues.push({ rule: 'tabindex-positive', message: `${tabindexPositive} elements with positive tabindex`, severity: 'moderate', wcag: '2.4.3' });
  }

  // ─── Video/Audio ───
  const mediaElements = $('video, audio').length;
  const mediaWithCaptions = $('video track[kind="captions"], video track[kind="subtitles"]').length;
  if (mediaElements > 0 && mediaWithCaptions === 0) {
    score -= 5;
    issues.push({ rule: 'media-captions', message: 'Media elements without captions/subtitles', severity: 'serious', wcag: '1.2.2' });
  }

  // Calculate final score
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return {
    score,
    grade,
    issues,
    passes,
    summary: {
      critical: issues.filter(i => i.severity === 'critical').length,
      serious: issues.filter(i => i.severity === 'serious').length,
      moderate: issues.filter(i => i.severity === 'moderate').length,
      passes: passes.length,
    }
  };
}

/* ═══════════════════════════════════════════════════
   CONTENT QUALITY ANALYSIS — Readability & structure
   ═══════════════════════════════════════════════════ */

function analyzeContentQuality($, html) {
  // Extract clean text content
  const $clone = $.root().clone();
  $clone.find('script, style, noscript, svg, code, pre, nav, footer, header').remove();
  const text = $clone.find('body').text().replace(/\s+/g, ' ').trim();
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const paragraphs = $('p').filter((_, el) => $(el).text().trim().length > 20).length;
  
  // Word statistics
  const wordCount = words.length;
  const avgWordLength = wordCount > 0 
    ? Math.round(words.reduce((sum, w) => sum + w.length, 0) / wordCount * 10) / 10 
    : 0;
  
  // Sentence statistics
  const sentenceCount = sentences.length;
  const avgSentenceLength = sentenceCount > 0
    ? Math.round(words.length / sentenceCount * 10) / 10
    : 0;

  // Flesch Reading Ease approximation
  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const fleschScore = sentenceCount > 0 && wordCount > 0
    ? Math.round(206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount))
    : 0;
  
  // Clamp Flesch score
  const clampedFlesch = Math.max(0, Math.min(100, fleschScore));

  // Reading level
  let readingLevel;
  if (clampedFlesch >= 90) readingLevel = '5th grade';
  else if (clampedFlesch >= 80) readingLevel = '6th grade';
  else if (clampedFlesch >= 70) readingLevel = '7th grade';
  else if (clampedFlesch >= 60) readingLevel = '8th-9th grade';
  else if (clampedFlesch >= 50) readingLevel = '10th-12th grade';
  else if (clampedFlesch >= 30) readingLevel = 'College';
  else readingLevel = 'College graduate';

  // Reading time
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  // Content structure analysis
  const h1Count = $('h1').length;
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  const listCount = $('ul, ol').length;
  const listItems = $('li').length;
  const tableCount = $('table').length;
  const imageCount = $('img').length;
  const videoCount = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
  const codeBlockCount = $('code, pre').length;
  const blockquoteCount = $('blockquote').length;

  // Keyword density (top words)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also']);
  
  const wordFreq = {};
  words.forEach(word => {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.length > 3 && !stopWords.has(lower)) {
      wordFreq[lower] = (wordFreq[lower] || 0) + 1;
    }
  });
  
  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      density: Math.round((count / wordCount) * 1000) / 10
    }));

  // Content score
  let contentScore = 50; // Base score
  
  // Word count scoring
  if (wordCount >= 1000) contentScore += 20;
  else if (wordCount >= 500) contentScore += 15;
  else if (wordCount >= 300) contentScore += 10;
  else if (wordCount >= 100) contentScore += 5;
  else contentScore -= 10;

  // Structure scoring
  if (h1Count === 1) contentScore += 5;
  if (h2Count >= 2) contentScore += 5;
  if (paragraphs >= 3) contentScore += 5;
  if (listCount > 0) contentScore += 3;
  if (imageCount > 0) contentScore += 5;

  // Readability scoring
  if (clampedFlesch >= 60) contentScore += 5;
  else if (clampedFlesch < 30) contentScore -= 5;

  contentScore = Math.max(0, Math.min(100, contentScore));

  // Determine grade
  let grade;
  if (contentScore >= 85) grade = 'A';
  else if (contentScore >= 70) grade = 'B';
  else if (contentScore >= 55) grade = 'C';
  else if (contentScore >= 40) grade = 'D';
  else grade = 'F';

  return {
    score: contentScore,
    grade,
    
    // Text statistics
    wordCount,
    sentenceCount,
    paragraphCount: paragraphs,
    avgWordLength,
    avgSentenceLength,
    readingTimeMinutes,
    
    // Readability
    fleschScore: clampedFlesch,
    readingLevel,
    
    // Structure
    structure: {
      headings: { h1: h1Count, h2: h2Count, h3: h3Count },
      lists: listCount,
      listItems,
      tables: tableCount,
      images: imageCount,
      videos: videoCount,
      codeBlocks: codeBlockCount,
      blockquotes: blockquoteCount,
    },
    
    // Keywords
    topKeywords,
  };
}

// Helper: Count syllables in a word (approximation)
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

/* ═══════════════════════════════════════════════════
   SUGGESTIONS ENGINE — Smart improvement recommendations
   ═══════════════════════════════════════════════════ */

function generateSuggestions($, data, pageUrl) {
  const suggestions = [];

  const add = (category, priority, title, description, impact) => {
    suggestions.push({ category, priority, title, description, impact });
  };

  // ─── SEO Suggestions ──────────────────────────────
  if (!data.title) {
    add('seo', 'high', 'Missing Page Title', 'The page has no <title> tag. Search engines use this as the main headline in results. Add a unique, descriptive title (50-60 characters).', 'Critical for search rankings');
  } else if (data.title.length < 20) {
    add('seo', 'medium', 'Title Too Short', `Your title "${data.title}" is only ${data.title.length} characters. Aim for 50-60 characters for better SEO visibility.`, 'May reduce click-through rate');
  } else if (data.title.length > 70) {
    add('seo', 'low', 'Title Too Long', `Your title is ${data.title.length} characters. Search engines typically truncate after 60 chars. Consider shortening it.`, 'Title may be cut off in search results');
  }

  if (!data.metaDescription) {
    add('seo', 'high', 'Missing Meta Description', 'No meta description found. Add a compelling 150-160 character description to improve click-through rates from search results.', 'Major impact on search CTR');
  } else if (data.metaDescription.length < 70) {
    add('seo', 'medium', 'Meta Description Too Short', `Your meta description is only ${data.metaDescription.length} characters. Aim for 150-160 characters to maximize search result real estate.`, 'Missed opportunity for search visibility');
  } else if (data.metaDescription.length > 170) {
    add('seo', 'low', 'Meta Description Too Long', `Your meta description is ${data.metaDescription.length} characters. It may be truncated in search results. Keep it under 160 characters.`, 'Description may be cut off');
  }

  const h1Count = (data.headings?.h1 || []).length;
  if (h1Count === 0) {
    add('seo', 'high', 'Missing H1 Heading', 'No H1 heading found. Every page should have exactly one H1 that clearly describes the page content.', 'Important ranking signal');
  } else if (h1Count > 1) {
    add('seo', 'medium', 'Multiple H1 Headings', `Found ${h1Count} H1 headings. Best practice is to have exactly one H1 per page for clear content hierarchy.`, 'May confuse search engines');
  }

  const h2Count = (data.headings?.h2 || []).length;
  if (h1Count > 0 && h2Count === 0 && data.wordCount > 300) {
    add('seo', 'medium', 'No H2 Subheadings', 'Content has 300+ words but no H2 subheadings. Break content into sections with descriptive H2s for better readability and SEO.', 'Improves content structure');
  }

  if (!data.metadata?.canonical) {
    add('seo', 'medium', 'Missing Canonical URL', 'No canonical link tag found. Add <link rel="canonical"> to prevent duplicate content issues.', 'Prevents SEO dilution');
  }

  if (!data.metadata?.language) {
    add('seo', 'low', 'Missing Language Attribute', 'The <html> tag has no lang attribute. Add lang="en" (or appropriate language) for accessibility and SEO.', 'Helps search engines serve correct results');
  }

  const ogKeys = Object.keys(data.metadata?.openGraph || {});
  if (ogKeys.length === 0) {
    add('seo', 'medium', 'Missing Open Graph Tags', 'No Open Graph meta tags found. Add og:title, og:description, og:image for better social media sharing previews.', 'Links shared on social media will lack rich previews');
  } else {
    if (!data.metadata?.openGraph?.image) {
      add('seo', 'medium', 'Missing OG Image', 'Open Graph tags exist but no og:image. Social shares will lack a preview image, reducing engagement.', 'Social shares get 2-3x more clicks with images');
    }
  }

  const twitterKeys = Object.keys(data.metadata?.twitterCard || {});
  if (twitterKeys.length === 0 && ogKeys.length === 0) {
    add('seo', 'low', 'Missing Twitter Card', 'No Twitter Card meta tags found. Add twitter:card, twitter:title, twitter:description for Twitter sharing.', 'Twitter shares will use generic previews');
  }

  // ─── Accessibility Suggestions ─────────────────────
  const imagesWithoutAlt = data.images.filter(img => !img.alt && img.source !== 'favicon');
  if (imagesWithoutAlt.length > 0) {
    const pct = Math.round((imagesWithoutAlt.length / Math.max(data.images.length, 1)) * 100);
    add('accessibility', 'high', `${imagesWithoutAlt.length} Images Missing Alt Text`,
      `${pct}% of images lack alt text. Screen readers can't describe these to visually impaired users. Add descriptive alt attributes to all content images.`,
      'Required for WCAG compliance');
  }

  if (!data.metadata?.viewport) {
    add('accessibility', 'high', 'Missing Viewport Meta Tag', 'No viewport meta tag found. Without it, the page won\'t render properly on mobile devices. Add <meta name="viewport" content="width=device-width, initial-scale=1">.', 'Page will not be mobile-friendly');
  }

  const formFields = (data.formsData || []).flatMap(f => f.fields || []);
  const inputsWithoutLabels = formFields.filter(f => !f.id && f.tag === 'input');
  if (inputsWithoutLabels.length > 0) {
    add('accessibility', 'medium', 'Form Inputs Missing Labels', `${inputsWithoutLabels.length} form input(s) lack proper IDs, making it hard to associate labels. Add id attributes and matching <label for="..."> elements.`, 'Hurts form usability for assistive tech');
  }

  // Check for skip navigation
  const firstLink = $('a').first().attr('href');
  if (firstLink !== '#main' && firstLink !== '#content' && firstLink !== '#main-content') {
    add('accessibility', 'low', 'Missing Skip Navigation', 'No "skip to content" link found as the first element. Add one to help keyboard/screen reader users bypass navigation.', 'Improves keyboard navigation');
  }

  // ─── Performance Suggestions ──────────────────────
  const externalScripts = data.scripts.filter(s => s.src);
  const nonAsyncScripts = externalScripts.filter(s => !s.async && !s.defer);
  if (nonAsyncScripts.length > 3) {
    add('performance', 'high', `${nonAsyncScripts.length} Render-Blocking Scripts`,
      `${nonAsyncScripts.length} external scripts load synchronously (no async/defer). This blocks page rendering. Add async or defer attributes to non-critical scripts.`,
      'Can significantly slow down page load');
  }

  if (externalScripts.length > 15) {
    add('performance', 'medium', `Too Many Scripts (${externalScripts.length})`, `Loading ${externalScripts.length} external scripts. Consider bundling, code splitting, or removing unused scripts to reduce HTTP requests.`, 'Each script adds network latency');
  }

  const externalCSS = data.stylesheets.filter(s => s.type === 'external');
  if (externalCSS.length > 8) {
    add('performance', 'medium', `Too Many CSS Files (${externalCSS.length})`, `Loading ${externalCSS.length} external CSS files. Consider combining stylesheets to reduce HTTP requests.`, 'Multiple CSS files delay rendering');
  }

  const largeImages = data.images.filter(img =>
    img.src && !img.src.includes('.svg') && !img.src.includes('.webp') && !img.src.includes('.avif')
  );
  const nonOptimizedImages = data.images.filter(img =>
    img.src && (img.src.endsWith('.png') || img.src.endsWith('.jpg') || img.src.endsWith('.jpeg') || img.src.endsWith('.bmp'))
  );
  if (nonOptimizedImages.length > 3) {
    add('performance', 'medium', 'Images Not Using Modern Formats',
      `${nonOptimizedImages.length} images use older formats (PNG/JPG). Consider converting to WebP or AVIF for 30-50% smaller file sizes.`,
      'Can dramatically reduce page weight');
  }

  const imagesWithoutDimensions = data.images.filter(img => !img.width && !img.height && img.source === 'img');
  if (imagesWithoutDimensions.length > 3) {
    add('performance', 'low', 'Images Missing Width/Height', `${imagesWithoutDimensions.length} images don't specify width and height attributes. This causes layout shifts (CLS) as images load.`, 'Hurts Core Web Vitals (CLS score)');
  }

  // ─── Security Suggestions ─────────────────────────
  const secInfo = data.securityInfo;
  if (secInfo) {
    if (secInfo.missingHeaders?.includes('CSP') && !secInfo.headers?.['CSP (meta)']) {
      add('security', 'high', 'Missing Content Security Policy', 'No CSP header or meta tag detected. CSP helps prevent XSS attacks by controlling which resources the browser loads.', 'Major protection against XSS attacks');
    }
    if (secInfo.missingHeaders?.includes('HSTS')) {
      add('security', 'high', 'Missing HSTS Header', 'Strict-Transport-Security header not found. Without HSTS, users could be downgraded from HTTPS to HTTP.', 'Protects against downgrade attacks');
    }
    if (secInfo.missingHeaders?.includes('X-Frame-Options')) {
      add('security', 'medium', 'Missing X-Frame-Options', 'X-Frame-Options header not set. This leaves the site vulnerable to clickjacking attacks.', 'Prevents clickjacking');
    }
    if (secInfo.missingHeaders?.includes('X-Content-Type-Options')) {
      add('security', 'low', 'Missing X-Content-Type-Options', 'Add X-Content-Type-Options: nosniff to prevent MIME-type sniffing attacks.', 'Prevents MIME confusion attacks');
    }
    if (secInfo.missingHeaders?.includes('Referrer-Policy')) {
      add('security', 'low', 'Missing Referrer Policy', 'No Referrer-Policy header. Set it to control what information is shared when navigating away from your site.', 'Protects user privacy');
    }

    if ((secInfo.score || 0) < 50) {
      add('security', 'high', `Low Security Score (${secInfo.score}%)`, `Only ${secInfo.score}% of recommended security headers are present. Implement the missing headers for better protection.`, 'Website is vulnerable to common attacks');
    }
  }

  const totalLeaks = data.leakedData?.totalFindings || 0;
  if (totalLeaks > 0) {
    add('security', 'high', `${totalLeaks} Potential Data Leak(s)`, 'Sensitive data patterns (API keys, tokens, credentials) were detected in the page source. Review the Leaked Data tab and remove exposed credentials immediately.', 'Exposed credentials can be exploited');
  }

  if (data.hiddenFields?.length > 5) {
    add('security', 'low', `${data.hiddenFields.length} Hidden Form Fields`, 'Many hidden form fields found. Ensure they don\'t contain sensitive data like session tokens that could be extracted.', 'Hidden fields are visible in source');
  }

  // ─── Content Suggestions ──────────────────────────
  if (data.wordCount < 100) {
    add('content', 'medium', 'Very Little Content', `Only ${data.wordCount} words on the page. Search engines prefer pages with substantial content (300+ words for blog posts, 500+ for articles).`, 'Thin content ranks poorly');
  } else if (data.wordCount < 300) {
    add('content', 'low', 'Content Could Be Longer', `${data.wordCount} words found. Consider expanding to at least 300 words for better SEO potential.`, 'Longer content tends to rank higher');
  }

  if (data.linksInternal.length === 0) {
    add('content', 'medium', 'No Internal Links', 'No internal links found on this page. Internal linking helps search engines discover content and distributes page authority.', 'Weakens site structure for SEO');
  }

  if (data.linksExternal.length === 0 && data.wordCount > 300) {
    add('content', 'low', 'No External Links', 'No outbound links found. Linking to authoritative external sources can improve credibility and SEO.', 'Minor ranking factor');
  }

  const brokenImageCount = data.images.filter(img => !img.src || img.src === 'undefined' || img.src === 'null').length;
  if (brokenImageCount > 0) {
    add('content', 'medium', `${brokenImageCount} Potentially Broken Images`, 'Some images have invalid or empty src attributes. Check and fix these broken image references.', 'Broken images hurt user experience');
  }

  if (data.socialLinks.length === 0) {
    add('content', 'low', 'No Social Media Links', 'No social media profile links found. Adding social links increases trust and provides additional ways for users to connect.', 'Builds brand credibility');
  }

  if (!data.metadata?.favicon) {
    add('content', 'low', 'Missing Favicon', 'No favicon found. Add a favicon for better brand recognition in browser tabs and bookmarks.', 'Professional polish');
  }

  // ─── Technical Suggestions ────────────────────────
  const jsonLd = data.metadata?.jsonLd || [];
  if (jsonLd.length === 0) {
    add('technical', 'medium', 'No Structured Data', 'No JSON-LD structured data found. Add schema.org markup (Organization, Article, Product, etc.) to enable rich search results.', 'Enables rich snippets in Google');
  }

  if (!pageUrl.startsWith('https://')) {
    add('technical', 'high', 'Not Using HTTPS', 'The page is served over HTTP, not HTTPS. Switch to HTTPS for security, SEO, and user trust.', 'Google penalizes non-HTTPS sites');
  }

  const inlineStyles = $('[style]').length;
  if (inlineStyles > 20) {
    add('technical', 'low', `${inlineStyles} Inline Styles Found`, 'Many inline styles detected. Move styles to external CSS files for better maintainability and caching.', 'Increases HTML size and hurts caching');
  }

  // Sort by priority: high first, then medium, then low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

/**
 * Calculate comprehensive SEO score (0-100)
 */
function calculateSEOScore($, data) {
  let score = 100;
  const deductions = [];
  const bonuses = [];

  // ═══════════════════════════════════════════════════
  // TITLE ANALYSIS (max -15)
  // ═══════════════════════════════════════════════════
  if (!data.title) {
    score -= 15;
    deductions.push({ category: 'title', reason: 'Missing title tag', points: -15, severity: 'critical' });
  } else {
    const titleLen = data.title.length;
    if (titleLen < 20) {
      score -= 8;
      deductions.push({ category: 'title', reason: `Title too short (${titleLen} chars)`, points: -8, severity: 'high' });
    } else if (titleLen < 30) {
      score -= 4;
      deductions.push({ category: 'title', reason: `Title could be longer (${titleLen} chars)`, points: -4, severity: 'medium' });
    } else if (titleLen > 70) {
      score -= 3;
      deductions.push({ category: 'title', reason: `Title may be truncated (${titleLen} chars)`, points: -3, severity: 'low' });
    } else if (titleLen >= 50 && titleLen <= 60) {
      score += 2;
      bonuses.push({ category: 'title', reason: 'Perfect title length', points: +2 });
    }
  }

  // ═══════════════════════════════════════════════════
  // META DESCRIPTION (max -12)
  // ═══════════════════════════════════════════════════
  if (!data.metaDescription) {
    score -= 12;
    deductions.push({ category: 'meta', reason: 'Missing meta description', points: -12, severity: 'critical' });
  } else {
    const descLen = data.metaDescription.length;
    if (descLen < 70) {
      score -= 6;
      deductions.push({ category: 'meta', reason: `Meta description too short (${descLen} chars)`, points: -6, severity: 'high' });
    } else if (descLen > 160) {
      score -= 2;
      deductions.push({ category: 'meta', reason: `Meta description may be truncated (${descLen} chars)`, points: -2, severity: 'low' });
    } else if (descLen >= 140 && descLen <= 160) {
      score += 2;
      bonuses.push({ category: 'meta', reason: 'Optimal meta description length', points: +2 });
    }
  }

  // ═══════════════════════════════════════════════════
  // HEADING STRUCTURE (max -12)
  // ═══════════════════════════════════════════════════
  const h1Count = data.headings?.h1?.length || 0;
  const h2Count = data.headings?.h2?.length || 0;
  const h3Count = data.headings?.h3?.length || 0;
  
  if (h1Count === 0) {
    score -= 10;
    deductions.push({ category: 'headings', reason: 'Missing H1 heading', points: -10, severity: 'critical' });
  } else if (h1Count > 1) {
    score -= 4;
    deductions.push({ category: 'headings', reason: `Multiple H1 headings (${h1Count})`, points: -4, severity: 'medium' });
  } else {
    score += 2;
    bonuses.push({ category: 'headings', reason: 'Single H1 heading', points: +2 });
  }
  
  if (h2Count === 0 && data.wordCount > 150) {
    score -= 4;
    deductions.push({ category: 'headings', reason: 'No H2 subheadings for long content', points: -4, severity: 'medium' });
  } else if (h2Count >= 2 && h2Count <= 8) {
    score += 2;
    bonuses.push({ category: 'headings', reason: 'Good heading structure', points: +2 });
  }

  // Check heading hierarchy
  if (h3Count > 0 && h2Count === 0) {
    score -= 2;
    deductions.push({ category: 'headings', reason: 'H3 without H2 (broken hierarchy)', points: -2, severity: 'low' });
  }

  // ═══════════════════════════════════════════════════
  // CONTENT QUALITY (max -15)
  // ═══════════════════════════════════════════════════
  const wordCount = data.wordCount || 0;
  
  if (wordCount < 50) {
    score -= 12;
    deductions.push({ category: 'content', reason: `Very thin content (${wordCount} words)`, points: -12, severity: 'critical' });
  } else if (wordCount < 150) {
    score -= 8;
    deductions.push({ category: 'content', reason: `Low word count (${wordCount} words)`, points: -8, severity: 'high' });
  } else if (wordCount < 300) {
    score -= 4;
    deductions.push({ category: 'content', reason: `Could use more content (${wordCount} words)`, points: -4, severity: 'medium' });
  } else if (wordCount >= 500) {
    score += 3;
    bonuses.push({ category: 'content', reason: `Substantial content (${wordCount} words)`, points: +3 });
  }

  // Paragraph analysis
  const paragraphs = data.paragraphs || [];
  const avgParagraphLength = paragraphs.length > 0 
    ? paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length 
    : 0;
  
  if (paragraphs.length >= 3 && avgParagraphLength >= 50) {
    score += 2;
    bonuses.push({ category: 'content', reason: 'Well-structured paragraphs', points: +2 });
  }

  // ═══════════════════════════════════════════════════
  // IMAGE OPTIMIZATION (max -10)
  // ═══════════════════════════════════════════════════
  const images = data.images || [];
  const totalImages = images.length;
  
  if (totalImages > 0) {
    const imagesWithAlt = images.filter(img => img.alt && img.alt.trim().length > 0).length;
    const altPercentage = (imagesWithAlt / totalImages) * 100;
    
    if (altPercentage < 50) {
      score -= 8;
      deductions.push({ category: 'images', reason: `Most images missing alt text (${Math.round(altPercentage)}%)`, points: -8, severity: 'high' });
    } else if (altPercentage < 80) {
      score -= 4;
      deductions.push({ category: 'images', reason: `Some images missing alt text (${Math.round(altPercentage)}%)`, points: -4, severity: 'medium' });
    } else if (altPercentage === 100) {
      score += 3;
      bonuses.push({ category: 'images', reason: 'All images have alt text', points: +3 });
    }

    // Check for lazy loading
    const lazyImages = images.filter(img => img.source === 'img' || img.source === 'srcset').length;
    if (lazyImages > 5) {
      const hasLazyLoad = $('img[loading="lazy"]').length > 0 || $('img[data-src]').length > 0;
      if (!hasLazyLoad) {
        score -= 2;
        deductions.push({ category: 'images', reason: 'Many images without lazy loading', points: -2, severity: 'low' });
      }
    }
  } else if (wordCount > 300) {
    score -= 2;
    deductions.push({ category: 'images', reason: 'No images for content-heavy page', points: -2, severity: 'low' });
  }

  // ═══════════════════════════════════════════════════
  // LINK STRUCTURE (max -8)
  // ═══════════════════════════════════════════════════
  const internalLinks = data.linksInternal?.length || 0;
  const externalLinks = data.linksExternal?.length || 0;
  
  if (internalLinks === 0) {
    score -= 5;
    deductions.push({ category: 'links', reason: 'No internal links', points: -5, severity: 'high' });
  } else if (internalLinks >= 3) {
    score += 2;
    bonuses.push({ category: 'links', reason: `Good internal linking (${internalLinks} links)`, points: +2 });
  }
  
  if (externalLinks === 0 && wordCount > 500) {
    score -= 2;
    deductions.push({ category: 'links', reason: 'No external links for long content', points: -2, severity: 'low' });
  }

  // Check for broken link indicators (empty hrefs)
  const emptyLinks = $('a[href=""], a[href="#"], a:not([href])').length;
  if (emptyLinks > 3) {
    score -= 3;
    deductions.push({ category: 'links', reason: `${emptyLinks} empty/broken links`, points: -3, severity: 'medium' });
  }

  // ═══════════════════════════════════════════════════
  // TECHNICAL SEO (max -20)
  // ═══════════════════════════════════════════════════
  const metadata = data.metadata || {};
  
  // Canonical URL
  if (!metadata.canonical) {
    score -= 4;
    deductions.push({ category: 'technical', reason: 'Missing canonical URL', points: -4, severity: 'high' });
  } else {
    score += 1;
    bonuses.push({ category: 'technical', reason: 'Has canonical URL', points: +1 });
  }
  
  // Open Graph
  const hasOG = metadata.ogTitle || metadata.ogDescription || metadata.ogImage;
  if (!hasOG) {
    score -= 4;
    deductions.push({ category: 'technical', reason: 'Missing Open Graph tags', points: -4, severity: 'medium' });
  } else {
    const ogComplete = metadata.ogTitle && metadata.ogDescription && metadata.ogImage;
    if (ogComplete) {
      score += 3;
      bonuses.push({ category: 'technical', reason: 'Complete Open Graph tags', points: +3 });
    }
  }

  // Twitter Cards
  const hasTwitter = metadata.twitterCard || metadata.twitterTitle;
  if (!hasTwitter) {
    score -= 2;
    deductions.push({ category: 'technical', reason: 'Missing Twitter Card tags', points: -2, severity: 'low' });
  }
  
  // Viewport
  if (!metadata.viewport) {
    score -= 5;
    deductions.push({ category: 'technical', reason: 'Missing viewport meta tag', points: -5, severity: 'critical' });
  }

  // Language
  const htmlLang = $('html').attr('lang');
  if (!htmlLang) {
    score -= 3;
    deductions.push({ category: 'technical', reason: 'Missing lang attribute', points: -3, severity: 'medium' });
  }

  // Charset
  const hasCharset = $('meta[charset]').length > 0 || $('meta[http-equiv="Content-Type"]').length > 0;
  if (!hasCharset) {
    score -= 2;
    deductions.push({ category: 'technical', reason: 'Missing charset declaration', points: -2, severity: 'medium' });
  }

  // Robots meta
  const robotsMeta = $('meta[name="robots"]').attr('content') || '';
  if (robotsMeta.includes('noindex')) {
    score -= 5;
    deductions.push({ category: 'technical', reason: 'Page set to noindex', points: -5, severity: 'high' });
  }

  // ═══════════════════════════════════════════════════
  // STRUCTURED DATA (bonus up to +8)
  // ═══════════════════════════════════════════════════
  const jsonLd = metadata.jsonLd || [];
  if (jsonLd.length > 0) {
    score += 5;
    bonuses.push({ category: 'structured', reason: `Has JSON-LD structured data (${jsonLd.length} schemas)`, points: +5 });
    
    // Check for specific valuable schemas
    const schemaTypes = jsonLd.map(j => j['@type']).filter(Boolean);
    const valuableTypes = ['Organization', 'LocalBusiness', 'Product', 'Article', 'BreadcrumbList', 'FAQPage', 'HowTo'];
    const hasValuable = valuableTypes.some(t => schemaTypes.includes(t));
    if (hasValuable) {
      score += 3;
      bonuses.push({ category: 'structured', reason: 'Has rich schema types', points: +3 });
    }
  }

  // Microdata
  const hasMicrodata = $('[itemscope]').length > 0;
  if (hasMicrodata && jsonLd.length === 0) {
    score += 2;
    bonuses.push({ category: 'structured', reason: 'Has Microdata markup', points: +2 });
  }

  // ═══════════════════════════════════════════════════
  // MOBILE FRIENDLINESS (max -8)
  // ═══════════════════════════════════════════════════
  const viewportContent = metadata.viewport || '';
  if (viewportContent && !viewportContent.includes('width=device-width')) {
    score -= 3;
    deductions.push({ category: 'mobile', reason: 'Viewport not mobile-optimized', points: -3, severity: 'medium' });
  }

  // Touch icons
  const hasTouchIcon = $('link[rel*="apple-touch-icon"]').length > 0;
  if (hasTouchIcon) {
    score += 1;
    bonuses.push({ category: 'mobile', reason: 'Has Apple touch icon', points: +1 });
  }

  // ═══════════════════════════════════════════════════
  // PERFORMANCE INDICATORS (max -8)
  // ═══════════════════════════════════════════════════
  const scripts = data.scripts || [];
  const externalScripts = scripts.filter(s => s.src).length;
  const inlineScripts = scripts.filter(s => !s.src).length;
  
  if (externalScripts > 15) {
    score -= 4;
    deductions.push({ category: 'performance', reason: `Too many external scripts (${externalScripts})`, points: -4, severity: 'medium' });
  }

  // Check for render-blocking scripts
  const blockingScripts = scripts.filter(s => s.src && !s.async && !s.defer).length;
  if (blockingScripts > 3) {
    score -= 3;
    deductions.push({ category: 'performance', reason: `${blockingScripts} render-blocking scripts`, points: -3, severity: 'medium' });
  }

  // Large inline scripts
  const largeInlineScripts = scripts.filter(s => s.inline && s.size > 5000).length;
  if (largeInlineScripts > 0) {
    score -= 2;
    deductions.push({ category: 'performance', reason: `${largeInlineScripts} large inline scripts`, points: -2, severity: 'low' });
  }

  // ═══════════════════════════════════════════════════
  // ACCESSIBILITY (bonus up to +5)
  // ═══════════════════════════════════════════════════
  const hasSkipLink = $('a[href="#main"], a[href="#content"], a.skip-link, a.skip-to-content').length > 0;
  if (hasSkipLink) {
    score += 1;
    bonuses.push({ category: 'accessibility', reason: 'Has skip navigation link', points: +1 });
  }

  const hasAriaLandmarks = $('[role="main"], [role="navigation"], [role="banner"], main, nav, header, footer').length >= 2;
  if (hasAriaLandmarks) {
    score += 2;
    bonuses.push({ category: 'accessibility', reason: 'Uses ARIA landmarks', points: +2 });
  }

  const formLabels = $('form label').length;
  const formInputs = $('form input:not([type="hidden"]):not([type="submit"]):not([type="button"])').length;
  if (formInputs > 0 && formLabels >= formInputs) {
    score += 2;
    bonuses.push({ category: 'accessibility', reason: 'Form inputs have labels', points: +2 });
  }

  // ═══════════════════════════════════════════════════
  // FINAL CALCULATIONS
  // ═══════════════════════════════════════════════════
  score = Math.max(0, Math.min(100, score));
  const roundedScore = Math.round(score);

  // Determine grade with + and -
  let grade;
  if (roundedScore >= 95) grade = 'A+';
  else if (roundedScore >= 90) grade = 'A';
  else if (roundedScore >= 85) grade = 'A-';
  else if (roundedScore >= 80) grade = 'B+';
  else if (roundedScore >= 75) grade = 'B';
  else if (roundedScore >= 70) grade = 'B-';
  else if (roundedScore >= 65) grade = 'C+';
  else if (roundedScore >= 60) grade = 'C';
  else if (roundedScore >= 55) grade = 'C-';
  else if (roundedScore >= 50) grade = 'D';
  else grade = 'F';

  // Group deductions by category
  const categories = {};
  [...deductions, ...bonuses].forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = { issues: [], score: 0 };
    }
    categories[item.category].issues.push(item);
    categories[item.category].score += item.points;
  });

  return {
    score: roundedScore,
    grade,
    deductions,
    bonuses,
    categories,
    summary: {
      critical: deductions.filter(d => d.severity === 'critical').length,
      high: deductions.filter(d => d.severity === 'high').length,
      medium: deductions.filter(d => d.severity === 'medium').length,
      low: deductions.filter(d => d.severity === 'low').length,
      bonuses: bonuses.length,
    }
  };
}

/* ═══════════════════════════════════════════════════════════════
   ELITE EXTRACTION FUNCTIONS — Maximum data extraction
   ═══════════════════════════════════════════════════════════════ */

/**
 * Extract RSS/Atom feed links
 */
function extractRSSFeeds($, baseUrl) {
  const feeds = [];
  const seen = new Set();

  // Standard RSS/Atom link tags
  $('link[type="application/rss+xml"], link[type="application/atom+xml"], link[type="application/feed+json"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || seen.has(href)) return;
    seen.add(href);
    let absoluteUrl;
    try { absoluteUrl = new URL(href, baseUrl.origin).href; } catch { absoluteUrl = href; }
    feeds.push({
      url: absoluteUrl,
      title: $(el).attr('title') || null,
      type: $(el).attr('type'),
    });
  });

  // Look for common feed URL patterns in links
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const lower = href.toLowerCase();
    if (lower.includes('/feed') || lower.includes('/rss') || lower.includes('/atom') || lower.endsWith('.rss') || lower.endsWith('.xml')) {
      if (seen.has(href)) return;
      seen.add(href);
      let absoluteUrl;
      try { absoluteUrl = new URL(href, baseUrl.origin).href; } catch { absoluteUrl = href; }
      feeds.push({ url: absoluteUrl, title: $(el).text().trim() || 'Feed', type: 'discovered' });
    }
  });

  return feeds.slice(0, 20);
}

/**
 * Extract API endpoint references from page source
 */
function extractAPIEndpoints($, html, baseUrl) {
  const endpoints = new Set();
  const apiPatterns = [
    /["'](\/api\/[^"'\s<>]{2,100})["']/gi,
    /["'](\/v[1-9]\/[^"'\s<>]{2,100})["']/gi,
    /["'](\/graphql\/?[^"'\s<>]{0,100})["']/gi,
    /["'](\/rest\/[^"'\s<>]{2,100})["']/gi,
    /fetch\s*\(\s*["']([^"'\s]{5,200})["']/gi,
    /axios\.[a-z]+\s*\(\s*["']([^"'\s]{5,200})["']/gi,
    /\.get\s*\(\s*["'](\/[^"'\s]{3,200})["']/gi,
    /\.post\s*\(\s*["'](\/[^"'\s]{3,200})["']/gi,
    /["'](https?:\/\/[^"'\s<>]*\/api\/[^"'\s<>]{2,100})["']/gi,
    /["'](https?:\/\/[^"'\s<>]*\/v[1-9]\/[^"'\s<>]{2,100})["']/gi,
  ];

  // Search in inline scripts only
  const scriptContent = [];
  $('script:not([src])').each((_, el) => {
    const content = $(el).html();
    if (content) scriptContent.push(content);
  });
  const scriptText = scriptContent.join('\n');

  for (const pattern of apiPatterns) {
    let match;
    while ((match = pattern.exec(scriptText)) !== null) {
      const url = match[1].trim();
      if (url.length > 3 && url.length < 300 && !url.includes('{{') && !url.includes('${')) {
        endpoints.add(url);
      }
    }
  }

  return [...endpoints].slice(0, 50).map(url => {
    let absoluteUrl = url;
    if (url.startsWith('/')) {
      try { absoluteUrl = new URL(url, baseUrl.origin).href; } catch {}
    }
    const method = url.includes('graphql') ? 'POST' : 'GET';
    return { url: absoluteUrl, originalPath: url, method };
  });
}

/**
 * Extract color palette from CSS
 */
function extractColorPalette($, html) {
  const colors = new Map();

  // From inline styles and style blocks
  const allCSS = [];
  $('style').each((_, el) => { allCSS.push($(el).html() || ''); });
  $('[style]').each((_, el) => { allCSS.push($(el).attr('style') || ''); });
  const cssText = allCSS.join('\n');

  // Hex colors
  const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
  let match;
  while ((match = hexRegex.exec(cssText)) !== null) {
    const hex = match[0].toLowerCase();
    if (hex.length >= 4) colors.set(hex, (colors.get(hex) || 0) + 1);
  }

  // RGB/RGBA colors
  const rgbRegex = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;
  while ((match = rgbRegex.exec(cssText)) !== null) {
    const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      const hex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
      colors.set(hex, (colors.get(hex) || 0) + 1);
    }
  }

  // HSL colors
  const hslRegex = /hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?/gi;
  while ((match = hslRegex.exec(cssText)) !== null) {
    colors.set(`hsl(${match[1]},${match[2]}%,${match[3]}%)`, (colors.get(`hsl(${match[1]},${match[2]}%,${match[3]}%)`) || 0) + 1);
  }

  // CSS custom properties (variables) for colors
  const cssVarRegex = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi;
  const cssVariables = [];
  while ((match = cssVarRegex.exec(cssText)) !== null) {
    cssVariables.push({ name: `--${match[1]}`, value: match[2] });
  }

  // Meta theme-color
  const themeColor = $('meta[name="theme-color"]').attr('content');

  // Sort by frequency
  const sorted = [...colors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([color, count]) => ({ color, count }));

  return {
    colors: sorted,
    totalUnique: colors.size,
    themeColor: themeColor || null,
    cssVariables: cssVariables.slice(0, 20),
  };
}

/**
 * Extract font information
 */
function extractFontInfo($, html) {
  const fonts = {
    families: [],
    googleFonts: [],
    adobeFonts: [],
    customFonts: [],
    fontFaceDeclarations: [],
  };

  // Google Fonts links
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const familyMatch = href.match(/family=([^&]+)/);
    if (familyMatch) {
      const families = decodeURIComponent(familyMatch[1]).split('|');
      families.forEach(f => {
        const name = f.split(':')[0].replace(/\+/g, ' ');
        if (name && !fonts.googleFonts.includes(name)) fonts.googleFonts.push(name);
      });
    }
  });

  // Adobe Fonts (Typekit)
  $('link[href*="use.typekit.net"]').each((_, el) => {
    fonts.adobeFonts.push($(el).attr('href'));
  });

  // @font-face declarations
  const allCSS = [];
  $('style').each((_, el) => { allCSS.push($(el).html() || ''); });
  const cssText = allCSS.join('\n');

  const fontFaceRegex = /@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'";}]+)/gi;
  let fmatch;
  while ((fmatch = fontFaceRegex.exec(cssText)) !== null) {
    const name = fmatch[1].trim();
    if (name && !fonts.customFonts.includes(name)) {
      fonts.customFonts.push(name);
      fonts.fontFaceDeclarations.push(name);
    }
  }

  // Font families from computed body style
  const bodyStyle = $('body').attr('style') || '';
  const fontFamilyMatch = bodyStyle.match(/font-family\s*:\s*([^;]+)/i);
  if (fontFamilyMatch) {
    fonts.families.push(fontFamilyMatch[1].trim());
  }

  // From CSS rules
  const cssFontRegex = /font-family\s*:\s*['"]?([^'";}\n]+)/gi;
  const fontSet = new Set();
  while ((fmatch = cssFontRegex.exec(cssText)) !== null) {
    const family = fmatch[1].trim();
    if (family && family.length < 200) fontSet.add(family);
  }
  fonts.families = [...fontSet].slice(0, 20);

  return fonts;
}

/**
 * Extract pricing information
 */
function extractPricing($) {
  const prices = [];

  // Look for price patterns in text
  const pricePatterns = [
    /\$\s?\d{1,7}(?:[.,]\d{1,2})?/g,
    /€\s?\d{1,7}(?:[.,]\d{1,2})?/g,
    /£\s?\d{1,7}(?:[.,]\d{1,2})?/g,
    /₹\s?\d{1,9}(?:[.,]\d{1,2})?/g,
    /¥\s?\d{1,9}(?:[.,]\d{1,2})?/g,
    /USD\s?\d{1,7}(?:[.,]\d{1,2})?/gi,
    /\d{1,7}(?:[.,]\d{2})?\s?(?:USD|EUR|GBP|INR|JPY)/gi,
  ];

  // Look in pricing-related containers
  const pricingSelectors = [
    '[class*="price"]', '[class*="pricing"]', '[class*="cost"]',
    '[class*="amount"]', '[id*="price"]', '[data-price]',
    '.plan', '.tier', '.package',
  ];

  const priceElements = new Set();
  for (const sel of pricingSelectors) {
    try {
      $(sel).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length < 500) priceElements.add(text);
      });
    } catch {}
  }

  // Extract prices from pricing elements
  for (const text of priceElements) {
    for (const pattern of pricePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => {
          if (!prices.some(p => p.value === m)) {
            prices.push({ value: m, context: text.substring(0, 100) });
          }
        });
      }
    }
  }

  // Also check JSON-LD for product pricing
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.offers) {
          const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (const offer of offers) {
            if (offer.price) {
              prices.push({
                value: `${offer.priceCurrency || '$'}${offer.price}`,
                context: item.name || 'Product',
                structured: true,
                currency: offer.priceCurrency,
                availability: offer.availability,
              });
            }
          }
        }
        // Check @graph
        if (item['@graph']) {
          for (const node of item['@graph']) {
            if (node.offers) {
              const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
              for (const offer of offers) {
                if (offer.price) {
                  prices.push({
                    value: `${offer.priceCurrency || '$'}${offer.price}`,
                    context: node.name || 'Product',
                    structured: true,
                  });
                }
              }
            }
          }
        }
      }
    } catch {}
  });

  return prices.slice(0, 50);
}

/**
 * Extract reviews and ratings
 */
function extractReviews($) {
  const reviews = [];

  // From JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        // Aggregate rating
        if (item.aggregateRating) {
          reviews.push({
            type: 'aggregate',
            ratingValue: item.aggregateRating.ratingValue,
            bestRating: item.aggregateRating.bestRating || 5,
            reviewCount: item.aggregateRating.reviewCount || item.aggregateRating.ratingCount,
            itemName: item.name,
          });
        }
        // Individual reviews
        if (item.review) {
          const revs = Array.isArray(item.review) ? item.review : [item.review];
          for (const rev of revs.slice(0, 20)) {
            reviews.push({
              type: 'review',
              author: rev.author?.name || rev.author || null,
              rating: rev.reviewRating?.ratingValue || null,
              body: (rev.reviewBody || '').substring(0, 300),
              date: rev.datePublished || null,
            });
          }
        }
        // Check @graph
        if (item['@graph']) {
          for (const node of item['@graph']) {
            if (node.aggregateRating) {
              reviews.push({
                type: 'aggregate',
                ratingValue: node.aggregateRating.ratingValue,
                reviewCount: node.aggregateRating.reviewCount,
                itemName: node.name,
              });
            }
          }
        }
      }
    } catch {}
  });

  // From HTML rating elements
  $('[class*="rating"], [class*="review"], [itemprop="ratingValue"], [itemprop="reviewBody"]').each((_, el) => {
    const rating = $(el).attr('content') || $(el).text().trim();
    if (rating && rating.length < 500) {
      const ratingNum = parseFloat(rating);
      if (!isNaN(ratingNum) && ratingNum >= 0 && ratingNum <= 5) {
        reviews.push({ type: 'html-rating', value: ratingNum, element: el.tagName });
      }
    }
  });

  // Star rating patterns (★★★★☆ or similar)
  const starText = $('body').text();
  const starMatch = starText.match(/[★☆]{3,5}/g);
  if (starMatch) {
    starMatch.slice(0, 5).forEach(s => {
      const filled = (s.match(/★/g) || []).length;
      const total = s.length;
      reviews.push({ type: 'star-rating', rating: filled, outOf: total });
    });
  }

  return reviews.slice(0, 30);
}

/**
 * Extract FAQ content
 */
function extractFAQs($) {
  const faqs = [];

  // From JSON-LD FAQPage schema
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'FAQPage' && item.mainEntity) {
          const entities = Array.isArray(item.mainEntity) ? item.mainEntity : [item.mainEntity];
          for (const entity of entities) {
            if (entity.name && entity.acceptedAnswer) {
              faqs.push({
                question: entity.name,
                answer: (entity.acceptedAnswer.text || '').substring(0, 500),
                source: 'json-ld',
              });
            }
          }
        }
        if (item['@graph']) {
          for (const node of item['@graph']) {
            if (node['@type'] === 'FAQPage' && node.mainEntity) {
              const entities = Array.isArray(node.mainEntity) ? node.mainEntity : [node.mainEntity];
              for (const entity of entities) {
                if (entity.name && entity.acceptedAnswer) {
                  faqs.push({ question: entity.name, answer: (entity.acceptedAnswer.text || '').substring(0, 500), source: 'json-ld' });
                }
              }
            }
          }
        }
      }
    } catch {}
  });

  // From HTML: details/summary elements
  $('details').each((_, el) => {
    const question = $(el).find('summary').text().trim();
    const answer = $(el).text().replace(question, '').trim();
    if (question && answer && question.length < 500) {
      faqs.push({ question, answer: answer.substring(0, 500), source: 'details-summary' });
    }
  });

  // From FAQ-like sections with common class patterns
  const faqSelectors = [
    '[class*="faq"] [class*="question"]', '[class*="faq"] [class*="title"]',
    '[class*="accordion"] [class*="header"]', '[class*="accordion"] [class*="title"]',
    '[id*="faq"] h3', '[id*="faq"] h4',
  ];

  for (const sel of faqSelectors) {
    try {
      $(sel).each((_, el) => {
        const question = $(el).text().trim();
        const answer = $(el).next().text().trim() || $(el).parent().find('[class*="answer"], [class*="content"], [class*="body"], p').first().text().trim();
        if (question && question.length > 5 && question.length < 500) {
          faqs.push({ question, answer: (answer || '').substring(0, 500), source: 'html-faq' });
        }
      });
    } catch {}
  }

  return faqs.slice(0, 50);
}

/**
 * Extract breadcrumb navigation
 */
function extractBreadcrumbs($) {
  const breadcrumbs = [];

  // From JSON-LD BreadcrumbList
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'BreadcrumbList' && item.itemListElement) {
          for (const crumb of item.itemListElement) {
            breadcrumbs.push({
              name: crumb.name || crumb.item?.name,
              url: crumb.item?.['@id'] || crumb.item,
              position: crumb.position,
              source: 'json-ld',
            });
          }
        }
        if (item['@graph']) {
          for (const node of item['@graph']) {
            if (node['@type'] === 'BreadcrumbList' && node.itemListElement) {
              for (const crumb of node.itemListElement) {
                breadcrumbs.push({
                  name: crumb.name || crumb.item?.name,
                  url: crumb.item?.['@id'] || crumb.item,
                  position: crumb.position,
                  source: 'json-ld',
                });
              }
            }
          }
        }
      }
    } catch {}
  });

  // From HTML breadcrumb elements
  const bcSelectors = [
    '[class*="breadcrumb"]', 'nav[aria-label*="breadcrumb"]',
    '[itemtype*="BreadcrumbList"]', '.breadcrumbs', '#breadcrumbs',
  ];

  if (breadcrumbs.length === 0) {
    for (const sel of bcSelectors) {
      try {
        $(sel).find('a, span, li').each((i, el) => {
          const text = $(el).text().trim();
          const href = $(el).attr('href') || $(el).find('a').attr('href');
          if (text && text.length < 100) {
            breadcrumbs.push({ name: text, url: href || null, position: i + 1, source: 'html' });
          }
        });
        if (breadcrumbs.length > 0) break;
      } catch {}
    }
  }

  return breadcrumbs;
}

/**
 * Extract navigation structure
 */
function extractNavigationStructure($, baseUrl) {
  const navItems = [];

  // Find primary nav
  const navSelectors = [
    'nav', 'header nav', '[role="navigation"]',
    '#nav', '#navigation', '.nav', '.navigation', '.navbar',
    'header .menu', 'header ul',
  ];

  for (const sel of navSelectors) {
    try {
      const $nav = $(sel).first();
      if ($nav.length === 0) continue;

      $nav.find('a[href]').each((_, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href');
        if (!text || !href || text.length > 100) return;
        if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        let absoluteUrl;
        try { absoluteUrl = new URL(href, baseUrl.origin).href; } catch { absoluteUrl = href; }

        // Detect if it's a dropdown parent
        const isDropdown = $(el).parent().find('ul, [class*="dropdown"], [class*="submenu"]').length > 0;
        const depth = $(el).parents('ul, ol').length - 1;

        navItems.push({
          text,
          url: absoluteUrl,
          depth: Math.max(0, depth),
          isDropdown,
        });
      });

      if (navItems.length > 0) break;
    } catch {}
  }

  return {
    items: navItems.slice(0, 50),
    totalItems: navItems.length,
    maxDepth: navItems.length > 0 ? Math.max(...navItems.map(n => n.depth)) : 0,
  };
}

/**
 * Discover OpenAPI/Swagger endpoints
 */
function extractOpenAPIs($, html, baseUrl) {
  const apis = [];
  const seen = new Set();

  // Common API doc paths
  const apiDocPatterns = [
    /["'](\/swagger[^"'\s]{0,100})["']/gi,
    /["'](\/api-docs[^"'\s]{0,100})["']/gi,
    /["'](\/openapi[^"'\s]{0,100})["']/gi,
    /["'](\/docs\/api[^"'\s]{0,100})["']/gi,
    /["'](\/redoc[^"'\s]{0,50})["']/gi,
  ];

  for (const pattern of apiDocPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const path = match[1];
      if (!seen.has(path)) {
        seen.add(path);
        let absoluteUrl;
        try { absoluteUrl = new URL(path, baseUrl.origin).href; } catch { absoluteUrl = path; }
        apis.push({ url: absoluteUrl, type: 'discovered' });
      }
    }
  }

  // Links pointing to API docs
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const lower = href.toLowerCase();
    if (lower.includes('swagger') || lower.includes('api-doc') || lower.includes('openapi') || lower.includes('/redoc')) {
      if (!seen.has(href)) {
        seen.add(href);
        let absoluteUrl;
        try { absoluteUrl = new URL(href, baseUrl.origin).href; } catch { absoluteUrl = href; }
        apis.push({ url: absoluteUrl, text: $(el).text().trim(), type: 'link' });
      }
    }
  });

  return apis.slice(0, 20);
}

/**
 * Generate page fingerprint for duplicate detection
 */
function generatePageFingerprint(html) {
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

/**
 * Detect page language
 */
function detectLanguage($, html) {
  const htmlLang = $('html').attr('lang') || $('html').attr('xml:lang');
  const contentLang = $('meta[http-equiv="content-language"]').attr('content');
  const ogLocale = $('meta[property="og:locale"]').attr('content');

  // Alternate languages
  const alternates = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    alternates.push({
      lang: $(el).attr('hreflang'),
      url: $(el).attr('href'),
    });
  });

  // Direction
  const dir = $('html').attr('dir') || $('body').attr('dir');

  return {
    primary: htmlLang || contentLang || ogLocale || null,
    contentLanguage: contentLang || null,
    ogLocale: ogLocale || null,
    direction: dir || 'ltr',
    alternateLanguages: alternates,
    isMultilingual: alternates.length > 0,
  };
}

/**
 * Extract copyright and legal information
 */
function extractCopyright($, html) {
  const results = {
    notices: [],
    year: null,
    owner: null,
    license: null,
    legalLinks: [],
  };

  // Copyright patterns
  const copyrightPatterns = [
    /(?:©|&copy;|copyright)\s*(?:(?:20|19)\d{2})?\s*[-–]?\s*(?:(?:20|19)\d{2})?\s*([^<\n.]{2,100})/gi,
    /(?:©|copyright)\s*((?:20|19)\d{2})/gi,
  ];

  // Look in footer first
  const footerText = $('footer').text() || '';
  for (const pattern of copyrightPatterns) {
    const match = pattern.exec(footerText);
    if (match) {
      results.notices.push(match[0].trim().substring(0, 200));
      const yearMatch = match[0].match(/(20|19)\d{2}/g);
      if (yearMatch) results.year = yearMatch[yearMatch.length - 1];
      if (match[1] && match[1].trim().length > 2) results.owner = match[1].trim().substring(0, 100);
    }
  }

  // Visible legal text
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  if (results.notices.length === 0) {
    for (const pattern of copyrightPatterns) {
      const match = pattern.exec(visibleText);
      if (match) {
        results.notices.push(match[0].trim().substring(0, 200));
        const yearMatch = match[0].match(/(20|19)\d{2}/g);
        if (yearMatch) results.year = yearMatch[yearMatch.length - 1];
      }
    }
  }

  // Legal page links
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim().toLowerCase();
    const lower = href.toLowerCase();
    const legalTerms = ['privacy', 'terms', 'legal', 'cookie', 'gdpr', 'tos', 'eula', 'disclaimer', 'imprint', 'impressum'];
    if (legalTerms.some(t => lower.includes(t) || text.includes(t))) {
      results.legalLinks.push({ text: $(el).text().trim(), url: href });
    }
  });

  results.legalLinks = results.legalLinks.slice(0, 10);

  // License from meta
  const license = $('meta[name="license"]').attr('content') || $('link[rel="license"]').attr('href');
  if (license) results.license = license;

  return results;
}

/**
 * Deep Schema.org extraction from JSON-LD
 */
function extractSchemaOrg($) {
  const schemas = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item['@type']) {
          schemas.push({
            type: item['@type'],
            name: item.name || null,
            description: (item.description || '').substring(0, 300) || null,
            url: item.url || null,
            image: item.image?.url || item.image || null,
            properties: Object.keys(item).filter(k => !k.startsWith('@')),
          });
        }
        // Expand @graph
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          for (const node of item['@graph']) {
            if (node['@type']) {
              schemas.push({
                type: node['@type'],
                name: node.name || null,
                description: (node.description || '').substring(0, 300) || null,
                url: node.url || null,
                properties: Object.keys(node).filter(k => !k.startsWith('@')),
              });
            }
          }
        }
      }
    } catch {}
  });

  return {
    schemas,
    types: [...new Set(schemas.map(s => s.type).flat())],
    count: schemas.length,
  };
}

/**
 * Extract Microdata (itemscope/itemprop)
 */
function extractMicrodata($) {
  const items = [];

  $('[itemscope]').each((_, el) => {
    const type = $(el).attr('itemtype') || null;
    const props = {};

    $(el).find('[itemprop]').each((_, prop) => {
      const name = $(prop).attr('itemprop');
      const value = $(prop).attr('content') || $(prop).attr('href') || $(prop).attr('src') || $(prop).text().trim();
      if (name && value) {
        props[name] = value.substring(0, 300);
      }
    });

    if (Object.keys(props).length > 0) {
      items.push({ type, properties: props });
    }
  });

  return items.slice(0, 20);
}

/**
 * Extract link relations (rel attributes on link tags)
 */
function extractLinkRelations($, baseUrl) {
  const relations = [];
  const seen = new Set();

  $('link[rel]').each((_, el) => {
    const rel = $(el).attr('rel');
    const href = $(el).attr('href');
    const type = $(el).attr('type') || null;
    const title = $(el).attr('title') || null;

    if (!rel) return;
    const key = `${rel}:${href}`;
    if (seen.has(key)) return;
    seen.add(key);

    let absoluteUrl = href;
    if (href) {
      try { absoluteUrl = new URL(href, baseUrl.origin).href; } catch {}
    }

    relations.push({ rel, href: absoluteUrl, type, title });
  });

  return relations.slice(0, 50);
}

/**
 * Analyze response headers for intelligence
 */
function analyzeResponseHeaders(headers) {
  const analysis = {
    server: headers['server'] || null,
    poweredBy: headers['x-powered-by'] || null,
    contentType: headers['content-type'] || null,
    contentEncoding: headers['content-encoding'] || null,
    cacheControl: headers['cache-control'] || null,
    expires: headers['expires'] || null,
    etag: headers['etag'] ? true : false,
    lastModified: headers['last-modified'] || null,
    age: headers['age'] || null,
    via: headers['via'] || null,
    altSvc: headers['alt-svc'] || null,
    xCache: headers['x-cache'] || null,
    xRequestId: headers['x-request-id'] || headers['x-req-id'] || null,
    xRuntime: headers['x-runtime'] || headers['x-response-time'] || null,
    // Compression
    isCompressed: !!(headers['content-encoding'] && (headers['content-encoding'].includes('gzip') || headers['content-encoding'].includes('br') || headers['content-encoding'].includes('deflate'))),
    compressionType: headers['content-encoding'] || 'none',
    // Caching
    isCached: !!(headers['x-cache'] && headers['x-cache'].toLowerCase().includes('hit')),
    // HTTP/2 or HTTP/3 hints
    supportsH2: !!(headers['alt-svc'] && (headers['alt-svc'].includes('h2') || headers['alt-svc'].includes('h3'))),
    // Custom headers (non-standard, could reveal tech)
    customHeaders: {},
  };

  // Collect non-standard headers  
  const standardHeaders = new Set([
    'content-type', 'content-length', 'content-encoding', 'cache-control',
    'date', 'server', 'expires', 'etag', 'last-modified', 'age', 'via',
    'connection', 'keep-alive', 'transfer-encoding', 'vary', 'accept-ranges',
  ]);

  for (const [key, val] of Object.entries(headers)) {
    if (key.startsWith('x-') || key.startsWith('cf-') || (!standardHeaders.has(key) && typeof val === 'string')) {
      analysis.customHeaders[key] = typeof val === 'string' ? val.substring(0, 200) : val;
    }
  }

  return analysis;
}