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
      'class="', "class='", 'data-', 'aria-',
      // Additional false-positive context markers
      'tutorial', 'readme', 'documentation', 'docs',
      'snippet', 'code-block', 'highlight', 'syntax',
      '<code', '</code', '<pre', '</pre',
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
      // Skip if inside code blocks (example code on docs/code-hosting sites)
      if (isInsideCodeBlock(match[0])) continue;
      // On code-hosting sites, all API key matches are from user code
      if (isCodeHostingSite) continue;
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
            value: token.substring(0, 20) + '...',
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
        value: passM[0].substring(0, 40) + (passM[0].length > 40 ? '...' : ''),
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
      value: u.substring(0, 30) + '...',
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

  // ─── Title Analysis (max -20) ───
  if (!data.title) {
    score -= 20;
    deductions.push({ reason: 'Missing title', points: -20 });
  } else {
    if (data.title.length < 20) {
      score -= 10;
      deductions.push({ reason: 'Title too short', points: -10 });
    } else if (data.title.length > 70) {
      score -= 5;
      deductions.push({ reason: 'Title too long', points: -5 });
    }
  }

  // ─── Meta Description (max -15) ───
  if (!data.metaDescription) {
    score -= 15;
    deductions.push({ reason: 'Missing meta description', points: -15 });
  } else {
    if (data.metaDescription.length < 70) {
      score -= 7;
      deductions.push({ reason: 'Meta description too short', points: -7 });
    } else if (data.metaDescription.length > 160) {
      score -= 3;
      deductions.push({ reason: 'Meta description too long', points: -3 });
    }
  }

  // ─── Headings Structure (max -15) ───
  const h1Count = data.headings?.h1?.length || 0;
  const h2Count = data.headings?.h2?.length || 0;
  
  if (h1Count === 0) {
    score -= 10;
    deductions.push({ reason: 'Missing H1 heading', points: -10 });
  } else if (h1Count > 1) {
    score -= 5;
    deductions.push({ reason: 'Multiple H1 headings', points: -5 });
  }
  
  if (h2Count === 0 && data.wordCount > 100) {
    score -= 5;
    deductions.push({ reason: 'No H2 subheadings', points: -5 });
  }

  // ─── Content Quality (max -15) ───
  if (data.wordCount < 50) {
    score -= 15;
    deductions.push({ reason: 'Very thin content', points: -15 });
  } else if (data.wordCount < 150) {
    score -= 10;
    deductions.push({ reason: 'Low word count', points: -10 });
  } else if (data.wordCount < 300) {
    score -= 5;
    deductions.push({ reason: 'Could use more content', points: -5 });
  }

  // ─── Images (max -10) ───
  const images = data.images || [];
  const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim() === '').length;
  const totalImages = images.length;
  
  if (totalImages > 0) {
    const percentWithoutAlt = (imagesWithoutAlt / totalImages) * 100;
    if (percentWithoutAlt > 50) {
      score -= 10;
      deductions.push({ reason: 'Most images missing alt text', points: -10 });
    } else if (percentWithoutAlt > 25) {
      score -= 5;
      deductions.push({ reason: 'Some images missing alt text', points: -5 });
    }
  }

  // ─── Links (max -10) ───
  const internalLinks = data.linksInternal?.length || 0;
  const externalLinks = data.linksExternal?.length || 0;
  
  if (internalLinks === 0) {
    score -= 5;
    deductions.push({ reason: 'No internal links', points: -5 });
  }
  
  if (externalLinks === 0 && data.wordCount > 300) {
    score -= 3;
    deductions.push({ reason: 'No external links', points: -3 });
  }

  // ─── Technical SEO (max -15) ───
  const metadata = data.metadata || {};
  
  if (!metadata.canonical) {
    score -= 5;
    deductions.push({ reason: 'Missing canonical URL', points: -5 });
  }
  
  if (!metadata.ogTitle && !metadata.ogDescription) {
    score -= 5;
    deductions.push({ reason: 'Missing Open Graph tags', points: -5 });
  }
  
  if (!metadata.viewport) {
    score -= 5;
    deductions.push({ reason: 'Missing viewport meta tag', points: -5 });
  }

  const htmlLang = $('html').attr('lang');
  if (!htmlLang) {
    score -= 3;
    deductions.push({ reason: 'Missing lang attribute', points: -3 });
  }

  // ─── Structured Data Bonus (+5) ───
  const jsonLd = metadata.jsonLd || [];
  if (jsonLd.length > 0) {
    score += 5;
    deductions.push({ reason: 'Has structured data', points: +5 });
  }

  // Ensure score is within 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    deductions,
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
  };
}