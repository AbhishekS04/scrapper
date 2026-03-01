/**
 * Tech Stack Detector
 * Detects CMS, frameworks, analytics, CDN from page HTML and headers
 */

const CMS_SIGNATURES = {
  'WordPress': [
    'wp-content', 'wp-includes', 'wp-json', 'wordpress',
    'wp-embed', 'woocommerce'
  ],
  'Shopify': [
    'cdn.shopify.com', 'shopify.com', 'Shopify.theme',
    'shopify-section'
  ],
  'Wix': [
    'wix.com', 'wixstatic.com', 'X-Wix-',
    'wix-warmup-data'
  ],
  'Squarespace': [
    'squarespace.com', 'sqsp.net', 'squarespace-cdn',
    'sqs-block'
  ],
  'Webflow': [
    'webflow.com', 'wf-', 'w-layout', 'webflow'
  ],
  'Drupal': [
    'drupal', 'Drupal.settings', '/sites/default/files'
  ],
  'Joomla': [
    'joomla', '/components/com_', '/media/jui/'
  ],
  'Ghost': [
    'ghost.org', 'ghost-', 'content/themes'
  ],
};

const FRAMEWORK_SIGNATURES = {
  'React': [
    '__NEXT_DATA__', 'react-root', '_reactRootContainer',
    'data-reactroot', 'react.production', 'react-dom'
  ],
  'Next.js': [
    '__NEXT_DATA__', '_next/static', 'next/router',
    '__next', 'next-route-announcer'
  ],
  'Vue.js': [
    '__vue_app__', 'vue.runtime', 'v-cloak',
    'vue-router', 'data-v-'
  ],
  'Nuxt': [
    '__NUXT__', '_nuxt/', 'nuxt-link', 'nuxt.config'
  ],
  'Angular': [
    'ng-version', 'ng-app', 'angular.js',
    'ng-controller', 'ng-model', 'angular.min.js'
  ],
  'Svelte': [
    'svelte', '__svelte', 'svelte-'
  ],
  'jQuery': [
    'jquery.min.js', 'jquery.js', 'jQuery'
  ],
  'Bootstrap': [
    'bootstrap.min.css', 'bootstrap.min.js', 'bootstrap.css'
  ],
  'Tailwind CSS': [
    'tailwindcss', 'tailwind.min.css'
  ],
  'Gatsby': [
    'gatsby-', '__gatsby', 'gatsby-image'
  ],
  'Remix': [
    '__remix', 'remix-run'
  ],
};

const ANALYTICS_SIGNATURES = {
  'Google Analytics': [
    'google-analytics.com', 'googletagmanager.com',
    'gtag(', 'ga.js', 'analytics.js', 'UA-', 'G-', 'gtm.js'
  ],
  'Google Tag Manager': [
    'googletagmanager.com/gtm.js', 'GTM-'
  ],
  'Hotjar': [
    'hotjar.com', 'hjid', 'hj('
  ],
  'Mixpanel': [
    'mixpanel.com', 'mixpanel.init'
  ],
  'Facebook Pixel': [
    'connect.facebook.net', 'fbq(', 'fbevents.js'
  ],
  'Segment': [
    'segment.com', 'analytics.js', 'segment.io'
  ],
  'Amplitude': [
    'amplitude.com', 'amplitude.init'
  ],
  'Plausible': [
    'plausible.io'
  ],
  'Matomo': [
    'matomo', 'piwik'
  ],
  'Heap': [
    'heap-', 'heapanalytics.com'
  ],
};

const CDN_SIGNATURES = {
  'Cloudflare': [
    'cloudflare', 'cf-ray', 'cdnjs.cloudflare.com',
    '__cf_bm', 'cf-cache-status'
  ],
  'Fastly': [
    'fastly', 'x-served-by', 'x-cache-hits'
  ],
  'Akamai': [
    'akamai', 'akam', 'akamaized.net'
  ],
  'Amazon CloudFront': [
    'cloudfront.net', 'x-amz-cf-'
  ],
  'Vercel': [
    'vercel', 'x-vercel-', 'vercel-analytics'
  ],
  'Netlify': [
    'netlify', 'x-nf-request-id'
  ],
  'jsDelivr': [
    'cdn.jsdelivr.net'
  ],
  'unpkg': [
    'unpkg.com'
  ],
};

/**
 * Detect tech stack from page HTML and headers
 */
export function detectTechStack(html, headers = {}) {
  const result = {
    cms: [],
    frameworks: [],
    analytics: [],
    cdn: [],
    server: null,
    poweredBy: null,
  };

  const lowerHtml = html.toLowerCase();
  const headerStr = JSON.stringify(headers).toLowerCase();
  const combined = lowerHtml + ' ' + headerStr;

  // Detect CMS
  for (const [name, sigs] of Object.entries(CMS_SIGNATURES)) {
    const found = sigs.some(sig => combined.includes(sig.toLowerCase()));
    if (found) result.cms.push(name);
  }

  // Detect Frameworks
  for (const [name, sigs] of Object.entries(FRAMEWORK_SIGNATURES)) {
    const found = sigs.some(sig => combined.includes(sig.toLowerCase()));
    if (found) result.frameworks.push(name);
  }

  // Detect Analytics
  for (const [name, sigs] of Object.entries(ANALYTICS_SIGNATURES)) {
    const found = sigs.some(sig => combined.includes(sig.toLowerCase()));
    if (found) result.analytics.push(name);
  }

  // Detect CDN
  for (const [name, sigs] of Object.entries(CDN_SIGNATURES)) {
    const found = sigs.some(sig => combined.includes(sig.toLowerCase()));
    if (found) result.cdn.push(name);
  }

  // Server info from headers
  if (headers['server']) {
    result.server = headers['server'];
  }
  if (headers['x-powered-by']) {
    result.poweredBy = headers['x-powered-by'];
  }

  return result;
}
