/**
 * Tech Stack Detector — ULTRA Edition
 * Detects 200+ technologies across 20 categories:
 * CMS, Frameworks, Analytics, CDN, Payments, Security/WAF, Chat, 
 * Email Marketing, A/B Testing, Hosting, Fonts, Maps, Video Players,
 * Advertising, Tag Managers, Customer Support, Social Widgets,
 * Search, E-commerce Platforms, Build Tools, and more
 */

const SIGNATURES = {
  // ═══ CMS & WEBSITE BUILDERS ═══
  cms: {
    'WordPress': ['wp-content', 'wp-includes', 'wp-json', 'wordpress', 'wp-embed', 'woocommerce', 'wp-admin', '/wp-login'],
    'Shopify': ['cdn.shopify.com', 'shopify.com', 'Shopify.theme', 'shopify-section', 'myshopify.com', 'shopify-buy'],
    'Wix': ['wix.com', 'wixstatic.com', 'X-Wix-', 'wix-warmup-data', 'wixsite.com', 'parastorage.com'],
    'Squarespace': ['squarespace.com', 'sqsp.net', 'squarespace-cdn', 'sqs-block'],
    'Webflow': ['webflow.com', 'wf-', 'w-layout', 'webflow', 'assets.website-files.com'],
    'Drupal': ['drupal', 'Drupal.settings', '/sites/default/files', 'drupal.js'],
    'Joomla': ['joomla', '/components/com_', '/media/jui/', '/administrator/'],
    'Ghost': ['ghost.org', 'ghost-', 'content/themes', 'ghost.io'],
    'Magento': ['mage/', 'magento', 'Mage.', '/skin/frontend/', 'Magento_'],
    'Contentful': ['contentful.com', 'ctfassets.net', 'contentful'],
    'Strapi': ['strapi', 'strapi.io'],
    'Sanity': ['sanity.io', 'cdn.sanity.io'],
    'HubSpot CMS': ['hs-scripts.com', 'hubspot', 'hsforms', 'hubspot.net'],
    'Weebly': ['weebly.com', 'editmysite.com'],
    'Blogger': ['blogger.com', 'blogspot.com', 'b/post-body'],
    'Medium': ['medium.com', '@medium', 'medium-'],
    'Craft CMS': ['craftcms', 'craft.'],
    'Prismic': ['prismic.io', 'cdn.prismic'],
    'Storyblok': ['storyblok.com', 'storyblok'],
    'DatoCMS': ['datocms.com', 'datocms-assets'],
    'Tilda': ['tilda.cc', 'tildacdn.com'],
    'Notion': ['notion.so', 'notion-static'],
    'Carrd': ['carrd.co', 'crd.co'],
    'Framer': ['framer.com', 'framerusercontent.com'],
    'PrestaShop': ['prestashop', 'presta'],
    'OpenCart': ['opencart', 'route=product'],
    'BigCommerce': ['bigcommerce.com', 'bigcommerce'],
    'WooCommerce': ['woocommerce', 'wc-', '/wc-api/'],
    'Sitecore': ['sitecore', '/sitecore/'],
    'Adobe Experience Manager': ['cq5dam', '/etc.clientlibs/', 'adobeaemcloud'],
    'Kentico': ['kentico', 'CMSPages'],
    'Umbraco': ['umbraco'],
    'Typo3': ['typo3', '/typo3conf/'],
  },

  // ═══ JAVASCRIPT FRAMEWORKS & LIBRARIES ═══
  frameworks: {
    'React': ['__NEXT_DATA__', 'react-root', '_reactRootContainer', 'data-reactroot', 'react.production', 'react-dom', 'data-reactid'],
    'Next.js': ['__NEXT_DATA__', '_next/static', 'next/router', '__next', 'next-route-announcer', '_next/image'],
    'Vue.js': ['__vue_app__', 'vue.runtime', 'v-cloak', 'vue-router', 'data-v-', 'vue.js', 'vue.min.js'],
    'Nuxt': ['__NUXT__', '_nuxt/', 'nuxt-link', 'nuxt.config'],
    'Angular': ['ng-version', 'ng-app', 'angular.js', 'ng-controller', 'ng-model', 'ng-reflect'],
    'Svelte': ['svelte', '__svelte', 'svelte-'],
    'SvelteKit': ['__sveltekit', '_app/immutable'],
    'Astro': ['astro-', 'astro-island'],
    'Solid.js': ['solid-js', 'solidjs'],
    'Qwik': ['qwik', 'q:container', 'qwikloader'],
    'jQuery': ['jquery.min.js', 'jquery.js', 'jQuery', 'jquery-'],
    'Alpine.js': ['x-data', 'x-show', 'x-bind', 'alpine.js', 'alpinejs'],
    'HTMX': ['htmx', 'hx-get', 'hx-post', 'hx-trigger', 'htmx.org'],
    'Gatsby': ['gatsby-', '__gatsby', 'gatsby-image'],
    'Remix': ['__remix', 'remix-run'],
    'Ember.js': ['ember', 'ember.js', 'ember-view'],
    'Backbone.js': ['backbone', 'backbone.js'],
    'Knockout.js': ['knockout', 'ko.observable', 'data-bind'],
    'Preact': ['preact', 'preact.min.js'],
    'Lit': ['lit-html', 'lit-element', '@lit/'],
    'Stimulus': ['stimulus', 'data-controller', 'data-action'],
    'Turbo': ['@hotwired/turbo', 'turbo-frame'],
    'Three.js': ['three.js', 'three.min.js', 'THREE.'],
    'D3.js': ['d3.js', 'd3.min.js', 'd3.select'],
    'Chart.js': ['chart.js', 'chart.min.js'],
    'Highcharts': ['highcharts', 'Highcharts'],
    'Leaflet': ['leafletjs.com', 'L.tileLayer'],
    'Mapbox': ['mapboxgl', 'mapbox-gl'],
    'GSAP': ['gsap', 'greensock', 'TweenMax', 'gsap.to'],
    'Anime.js': ['anime.js', 'anime.min.js'],
    'Lottie': ['lottie', 'lottie-web', 'lottie-player'],
    'Swiper': ['swiper', 'swiper-container', 'swiper-slide'],
    'Lodash': ['lodash', 'lodash.min.js'],
    'Socket.io': ['socket.io', 'io.connect'],
    'Redux': ['redux', '__REDUX_DEVTOOLS_EXTENSION__'],
    'Framer Motion': ['framer-motion', 'motion.div'],
  },

  // ═══ CSS FRAMEWORKS ═══
  cssFrameworks: {
    'Bootstrap': ['bootstrap.min.css', 'bootstrap.min.js', 'bootstrap.css', 'btn-primary', 'container-fluid'],
    'Tailwind CSS': ['tailwindcss', 'tailwind.min.css', 'tailwind.config'],
    'Bulma': ['bulma', 'bulma.min.css', 'is-primary'],
    'Material UI': ['mui', 'material-ui', 'MuiButton', '@mui/'],
    'Chakra UI': ['chakra', 'chakra-ui', '@chakra-ui'],
    'Ant Design': ['antd', 'ant-', 'ant-design'],
    'Foundation': ['foundation.min.css', 'foundation.css'],
    'Semantic UI': ['semantic.min.css', 'semantic-ui'],
    'Materialize': ['materialize.min.css', 'materialize.css'],
    'Vuetify': ['vuetify', 'v-application'],
    'DaisyUI': ['daisyui'],
    'Mantine': ['mantine', '@mantine'],
    'Styled Components': ['styled-components', 'sc-'],
    'Emotion': ['@emotion', 'emotion'],
    'UnoCSS': ['unocss', 'uno.css'],
    'Windi CSS': ['windicss', 'windi'],
    'Tachyons': ['tachyons'],
  },

  // ═══ ANALYTICS & TRACKING ═══
  analytics: {
    'Google Analytics 4': ['gtag(', 'G-', 'googletagmanager.com'],
    'Google Analytics (UA)': ['analytics.js', 'ga.js', 'UA-'],
    'Google Tag Manager': ['googletagmanager.com/gtm.js', 'GTM-'],
    'Hotjar': ['hotjar.com', 'hjid', 'hj('],
    'Mixpanel': ['mixpanel.com', 'mixpanel.init'],
    'Facebook Pixel': ['connect.facebook.net', 'fbq(', 'fbevents.js'],
    'Segment': ['segment.com', 'analytics.js/v1', 'segment.io'],
    'Amplitude': ['amplitude.com', 'amplitude.init', 'cdn.amplitude.com'],
    'Plausible': ['plausible.io'],
    'Matomo': ['matomo', 'piwik'],
    'Heap': ['heap-', 'heapanalytics.com'],
    'PostHog': ['posthog', 'app.posthog.com'],
    'Fathom': ['usefathom.com', 'fathom'],
    'Umami': ['analytics.umami'],
    'Clicky': ['clicky.com', 'static.getclicky.com'],
    'Clarity': ['clarity.ms'],
    'LogRocket': ['logrocket.com', 'LogRocket'],
    'FullStory': ['fullstory.com', 'fullstory'],
    'Mouseflow': ['mouseflow.com'],
    'Lucky Orange': ['luckyorange.com'],
    'Crazy Egg': ['crazyegg.com'],
    'Pendo': ['pendo.io', 'pendo-'],
    'Snowplow': ['snowplow', 'sp.js'],
    'Rudderstack': ['rudderstack', 'rudder.js'],
    'Pirsch': ['pirsch.io'],
    'GoatCounter': ['goatcounter.com'],
  },

  // ═══ CDN & INFRASTRUCTURE ═══
  cdn: {
    'Cloudflare': ['cloudflare', 'cf-ray', 'cdnjs.cloudflare.com', '__cf_bm', 'cf-cache-status'],
    'Fastly': ['fastly', 'x-served-by', 'x-cache-hits', 'fastly.net'],
    'Akamai': ['akamai', 'akam', 'akamaized.net'],
    'Amazon CloudFront': ['cloudfront.net', 'x-amz-cf-'],
    'Vercel': ['vercel', 'x-vercel-', 'vercel-analytics'],
    'Netlify': ['netlify', 'x-nf-request-id'],
    'jsDelivr': ['cdn.jsdelivr.net'],
    'unpkg': ['unpkg.com'],
    'Google Cloud CDN': ['googlevideo.com', 'x-goog-'],
    'Azure CDN': ['azureedge.net'],
    'BunnyCDN': ['bunnycdn', 'b-cdn.net'],
    'KeyCDN': ['keycdn.com', 'kxcdn.com'],
    'StackPath': ['stackpath', 'stackpathcdn.com'],
    'Fly.io': ['fly.io', 'x-fly-'],
    'Railway': ['railway.app'],
    'Render': ['onrender.com'],
  },

  // ═══ PAYMENT PROCESSORS ═══
  payments: {
    'Stripe': ['js.stripe.com', 'stripe.com', 'stripe-js', 'Stripe('],
    'PayPal': ['paypal.com', 'paypalobjects.com', 'paypal-button'],
    'Square': ['squareup.com', 'squarespace-payments'],
    'Braintree': ['braintree', 'braintreegateway'],
    'Adyen': ['adyen', 'adyen.com'],
    'Razorpay': ['razorpay.com', 'Razorpay(', 'razorpay'],
    'Paddle': ['paddle.com', 'paddle.js'],
    'Gumroad': ['gumroad.com', 'gumroad'],
    'Lemonsqueezy': ['lemonsqueezy'],
    'Klarna': ['klarna', 'klarna.com'],
    'Afterpay': ['afterpay', 'afterpay.com'],
    'Apple Pay': ['apple-pay', 'ApplePaySession'],
    'Google Pay': ['google-pay', 'pay.google.com'],
    'Amazon Pay': ['amazonpay', 'pay.amazon'],
    'Paytm': ['paytm.com', 'paytm'],
    'PhonePe': ['phonepe.com', 'phonepe'],
    'Cashfree': ['cashfree.com'],
  },

  // ═══ SECURITY & WAF ═══
  security: {
    'Cloudflare WAF': ['cf-ray', '__cf_bm', 'cf-cache-status'],
    'Sucuri WAF': ['x-sucuri-id', 'sucuri.net'],
    'Imperva/Incapsula': ['incap_ses_', '_incapsula_', 'imperva'],
    'AWS WAF': ['x-amzn-waf-', 'awswaf'],
    'Akamai Kona': ['ak_bmsc'],
    'F5 BIG-IP': ['BIGipServer', 'F5-'],
    'Wordfence': ['wordfence', 'wf-'],
    'reCAPTCHA': ['recaptcha', 'google.com/recaptcha', 'g-recaptcha'],
    'hCaptcha': ['hcaptcha', 'hcaptcha.com'],
    'Cloudflare Turnstile': ['cf-turnstile'],
    'PerimeterX': ['perimeterx', 'px-captcha'],
    'DataDome': ['datadome', 'datadome.co'],
    'SiteLock': ['sitelock', 'sitelock.com'],
  },

  // ═══ LIVE CHAT & MESSAGING ═══
  chat: {
    'Intercom': ['intercom', 'intercomcdn.com', 'intercom-'],
    'Drift': ['drift.com', 'driftt.com', 'js.driftt.com'],
    'Crisp': ['crisp.chat', 'client.crisp.chat'],
    'Tawk.to': ['tawk.to', 'embed.tawk.to'],
    'LiveChat': ['livechatinc.com'],
    'Zendesk Chat': ['zopim', 'zdassets.com'],
    'Freshchat': ['freshchat', 'wchat.freshchat.com'],
    'Tidio': ['tidio', 'tidio.co'],
    'Chatwoot': ['chatwoot', 'chatwoot.com'],
    'Olark': ['olark', 'olark.com'],
    'Help Scout': ['helpscout', 'beacon-v2'],
    'Smartsupp': ['smartsupp.com', 'smartsupp'],
    'JivoChat': ['jivosite.com', 'jivo'],
    'WhatsApp Chat': ['wa.me/', 'api.whatsapp.com'],
    'Facebook Messenger': ['m.me/', 'facebook.com/plugins/customerchat'],
  },

  // ═══ EMAIL MARKETING ═══
  emailMarketing: {
    'Mailchimp': ['mailchimp', 'mc-', 'list-manage.com', 'chimpstatic.com'],
    'ConvertKit': ['convertkit.com', 'convertkit'],
    'Klaviyo': ['klaviyo.com', 'klaviyo'],
    'ActiveCampaign': ['activecampaign.com', 'trackcmp.net'],
    'Drip': ['getdrip.com', 'drip.js'],
    'Sendinblue/Brevo': ['sendinblue', 'sibforms', 'brevo.com'],
    'Substack': ['substack.com', 'substackcdn.com'],
    'Beehiiv': ['beehiiv.com'],
    'MailerLite': ['mailerlite.com', 'ml-'],
    'Omnisend': ['omnisend.com', 'omnisrc.com'],
    'Buttondown': ['buttondown.email'],
  },

  // ═══ A/B TESTING ═══
  abTesting: {
    'Google Optimize': ['optimize.google.com', 'googleoptimize'],
    'Optimizely': ['optimizely.com', 'optimizely'],
    'VWO': ['visualwebsiteoptimizer.com', 'vwo_', 'vwo.com'],
    'AB Tasty': ['abtasty.com', 'abtasty'],
    'LaunchDarkly': ['launchdarkly.com', 'launchdarkly'],
    'Split.io': ['split.io'],
    'Statsig': ['statsig.com', 'statsig'],
    'PostHog Feature Flags': ['posthog.com'],
    'Flagsmith': ['flagsmith.com'],
  },

  // ═══ ADVERTISING ═══
  advertising: {
    'Google AdSense': ['pagead2.googlesyndication.com', 'adsbygoogle', 'google_ad_client'],
    'Google Ads': ['googleads.g.doubleclick.net', 'google_conversion'],
    'Google Ad Manager': ['securepubads.g.doubleclick.net', 'googletag'],
    'Facebook Ads': ['facebook.com/tr', 'fbq('],
    'Amazon Ads': ['amazon-adsystem.com', 'assoc-amazon'],
    'Twitter/X Ads': ['static.ads-twitter.com', 'twq('],
    'LinkedIn Ads': ['snap.licdn.com', '_linkedin_data_partner_ids'],
    'TikTok Ads': ['analytics.tiktok.com', 'ttq.load'],
    'Taboola': ['taboola.com', 'trc.taboola.com'],
    'Outbrain': ['outbrain.com', 'outbrainWidget'],
    'Criteo': ['criteo.com', 'criteo'],
    'Carbon Ads': ['carbonads.com', 'srv.carbonads.net'],
    'Ezoic': ['ezoic.com', 'ezojs'],
    'Mediavine': ['mediavine.com', 'mediavine'],
    'Prebid': ['prebid', 'pbjs'],
  },

  // ═══ FONT PROVIDERS ═══
  fonts: {
    'Google Fonts': ['fonts.googleapis.com', 'fonts.gstatic.com'],
    'Adobe Fonts': ['use.typekit.net', 'typekit'],
    'Font Awesome': ['fontawesome', 'font-awesome', 'fa-solid', 'fa-brands'],
    'Bootstrap Icons': ['bootstrap-icons'],
    'Material Icons': ['material-icons', 'fonts.googleapis.com/icon'],
    'Iconify': ['iconify', 'api.iconify.design'],
    'Lucide Icons': ['lucide', 'lucide-react'],
    'Heroicons': ['heroicons'],
    'Feather Icons': ['feather-icons', 'feathericons'],
    'Bunny Fonts': ['fonts.bunny.net'],
    'Custom Web Font': ['@font-face'],
  },

  // ═══ MAP SERVICES ═══
  maps: {
    'Google Maps': ['maps.google', 'maps.googleapis.com', 'google.com/maps'],
    'Mapbox': ['api.mapbox.com', 'mapbox-gl', 'mapboxgl'],
    'OpenStreetMap': ['openstreetmap.org', 'tile.openstreetmap'],
    'Leaflet': ['leafletjs.com', 'L.tileLayer'],
    'HERE Maps': ['here.com', 'heremaps'],
    'Bing Maps': ['bing.com/maps', 'virtualearth.net'],
    'Maplibre': ['maplibre', 'maplibre-gl'],
  },

  // ═══ VIDEO PLAYERS ═══
  videoPlayers: {
    'YouTube Embed': ['youtube.com/embed', 'youtube-nocookie.com', 'ytimg.com'],
    'Vimeo': ['player.vimeo.com', 'vimeo.com'],
    'Wistia': ['wistia.com', 'wistia-', 'fast.wistia.com'],
    'Vidyard': ['vidyard.com', 'play.vidyard.com'],
    'Video.js': ['video.js', 'vjs-', 'videojs'],
    'Plyr': ['plyr.io', 'plyr.js', 'plyr'],
    'JW Player': ['jwplayer', 'jwpcdn.com'],
    'Brightcove': ['brightcove', 'players.brightcove.net'],
    'Mux': ['mux.com', 'stream.mux.com', 'mux-player'],
    'Loom Embed': ['loom.com/embed', 'loom.com/share'],
  },

  // ═══ HOSTING PROVIDERS ═══
  hosting: {
    'AWS': ['amazonaws.com', 'x-amz-', 'elasticbeanstalk'],
    'Google Cloud': ['googleapis.com', 'x-goog-', 'appspot.com'],
    'Azure': ['azurewebsites.net', 'windows.net', 'x-azure-'],
    'Vercel': ['vercel.app', 'x-vercel-'],
    'Netlify': ['netlify.app', 'netlify.com'],
    'Heroku': ['herokuapp.com', 'heroku'],
    'DigitalOcean': ['digitaloceanspaces'],
    'Fly.io': ['fly.dev', 'fly.io'],
    'Railway': ['railway.app'],
    'Render': ['onrender.com'],
    'Cloudflare Pages': ['pages.dev'],
    'GitHub Pages': ['github.io'],
    'Firebase Hosting': ['firebaseapp.com', 'web.app'],
    'Supabase': ['supabase.co', 'supabase.com'],
    'WP Engine': ['wpengine', 'wpe.com'],
    'Kinsta': ['kinsta.com', 'kinsta.cloud'],
  },

  // ═══ AUTHENTICATION ═══
  auth: {
    'Auth0': ['auth0.com', 'auth0'],
    'Clerk': ['clerk.com', 'clerk.', 'clerk-js'],
    'Firebase Auth': ['firebase.auth', 'firebaseapp.com/auth'],
    'Supabase Auth': ['supabase.co/auth'],
    'Okta': ['okta.com', 'okta-'],
    'AWS Cognito': ['cognito', 'amazoncognito'],
    'NextAuth': ['next-auth', 'nextauth'],
    'Google Sign-In': ['accounts.google.com', 'gsi/client', 'g_id_'],
    'Facebook Login': ['FB.login'],
    'Apple Sign-In': ['appleid.apple.com'],
  },

  // ═══ MONITORING & ERROR TRACKING ═══
  monitoring: {
    'Sentry': ['sentry.io', 'sentry-', '@sentry/'],
    'Datadog': ['datadoghq.com', 'dd-', 'datadog'],
    'New Relic': ['newrelic', 'nr-data.net'],
    'Bugsnag': ['bugsnag', 'bugsnag.com'],
    'Rollbar': ['rollbar.com', 'rollbar'],
    'Raygun': ['raygun.io', 'raygun'],
    'Highlight.io': ['highlight.run', 'highlight.io'],
    'Grafana': ['grafana'],
    'BetterUptime': ['betteruptime.com'],
  },

  // ═══ BUILD TOOLS ═══
  buildTools: {
    'Webpack': ['webpack', '__webpack_', 'webpackChunk', 'webpackJsonp'],
    'Vite': ['/@vite/', 'vite/client', 'modulepreload'],
    'Parcel': ['parcelRequire'],
    'Turbopack': ['turbopack'],
    'Babel': ['regeneratorRuntime'],
    'TypeScript': ['tslib'],
  },

  // ═══ SOCIAL WIDGETS ═══
  socialWidgets: {
    'Twitter/X Embed': ['platform.twitter.com', 'twitter-tweet'],
    'Facebook SDK': ['connect.facebook.net', 'fb-root', 'facebook-jssdk'],
    'Instagram Embed': ['instagram.com/embed', 'instagram-media'],
    'LinkedIn Widget': ['platform.linkedin.com'],
    'Pinterest Widget': ['assets.pinterest.com', 'pinit.js'],
    'Discord Widget': ['discord.com/widget', 'discordapp.com/widget'],
    'ShareThis': ['sharethis.com', 'sharethis'],
    'AddThis': ['addthis.com', 'addthis'],
    'AddToAny': ['addtoany.com'],
  },

  // ═══ E-COMMERCE ═══
  ecommerce: {
    'Shopify': ['cdn.shopify.com', 'Shopify.theme'],
    'WooCommerce': ['woocommerce', 'add-to-cart'],
    'Magento': ['magento', 'Mage.'],
    'BigCommerce': ['bigcommerce'],
    'PrestaShop': ['prestashop'],
    'Snipcart': ['snipcart', 'snipcart.com'],
    'Ecwid': ['ecwid.com', 'ecwid'],
    'Medusa': ['medusajs', 'medusa'],
    'Saleor': ['saleor'],
    'Lemon Squeezy': ['lemonsqueezy.com'],
  },

  // ═══ BACKEND / SERVER ═══
  devops: {
    'GraphQL': ['graphql', '/graphql', '__typename'],
    'Firebase': ['firebase', 'firebaseio.com', 'firebaseapp.com'],
    'Supabase': ['supabase.co'],
    'Algolia': ['algolia', 'algolianet.com', 'algoliasearch'],
    'Meilisearch': ['meilisearch'],
    'Nginx': ['nginx'],
    'Apache': ['apache', 'httpd'],
    'Node.js/Express': ['x-powered-by: express'],
    'PHP': ['x-powered-by: php', '.php'],
    'Django': ['django', 'csrfmiddlewaretoken'],
    'Ruby on Rails': ['rails', 'action_dispatch'],
    'Laravel': ['laravel', 'laravel_session'],
    'ASP.NET': ['asp.net', '__viewstate'],
    'Spring Boot': ['x-application-context'],
  },
};

/**
 * Detect tech stack from page HTML and headers  
 * Returns 20 categories of detected technologies
 */
export function detectTechStack(html, headers = {}) {
  const result = {
    cms: [],
    frameworks: [],
    cssFrameworks: [],
    analytics: [],
    cdn: [],
    payments: [],
    security: [],
    chat: [],
    emailMarketing: [],
    abTesting: [],
    advertising: [],
    fonts: [],
    maps: [],
    videoPlayers: [],
    hosting: [],
    auth: [],
    monitoring: [],
    buildTools: [],
    socialWidgets: [],
    ecommerce: [],
    devops: [],
    server: null,
    poweredBy: null,
    meta: {
      totalDetected: 0,
      categories: 0,
    },
  };

  const lowerHtml = html.toLowerCase();
  const headerStr = JSON.stringify(headers).toLowerCase();
  const combined = lowerHtml + ' ' + headerStr;

  // Run detection for each category
  for (const [category, techs] of Object.entries(SIGNATURES)) {
    if (!result[category]) continue;
    for (const [name, sigs] of Object.entries(techs)) {
      // Special stricter logic for Magento CMS
      if (category === 'cms' && name === 'Magento') {
        // Require at least 2 unique Magento signatures to match
        const matches = sigs.filter(sig => combined.includes(sig.toLowerCase()));
        if (matches.length >= 2 && !result[category].includes(name)) {
          result[category].push(name);
        }
      } else {
        const found = sigs.some(sig => combined.includes(sig.toLowerCase()));
        if (found && !result[category].includes(name)) {
          result[category].push(name);
        }
      }
    }
  }

  // Server info from headers
  if (headers['server']) result.server = headers['server'];
  if (headers['x-powered-by']) result.poweredBy = headers['x-powered-by'];

  // Calculate meta stats
  let total = 0;
  let cats = 0;
  for (const [key, val] of Object.entries(result)) {
    if (Array.isArray(val) && val.length > 0) {
      total += val.length;
      cats++;
    }
  }
  result.meta.totalDetected = total;
  result.meta.categories = cats;
  result.meta.confidence = total > 10 ? 'high' : total > 3 ? 'medium' : 'low';

  return result;
}
