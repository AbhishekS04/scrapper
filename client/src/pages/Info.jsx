import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Info() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto animate-fade-in relative">
        
        {/* Header Button Container */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-white">How Scrape</span>
                <span className="text-gray-500">It Works</span>
              </div>
            </h1>
            <p className="text-sm text-gray-400 font-mono mt-2 ml-[60px]">Engine Architecture & Detailed Capabilities</p>
          </div>
          
          <button 
            onClick={() => navigate('/')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-gray-300 hover:text-white rounded-lg transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Scraper
          </button>
        </div>

        {/* Content Container */}
        <div className="space-y-10 lg:space-y-14">
          
          <section className="scroll-mt-24">
            <h3 className="text-sm sm:text-base font-semibold text-gray-200 uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="text-blue-400 text-xl">⚡</span> The Dual Engine Architecture
            </h3>
            <div className="bg-white/[0.02] border border-white/[0.05] p-6 sm:p-8 rounded-3xl space-y-4">
              <p className="text-base text-gray-400 leading-relaxed">
                I built a very smart "dual engine" for this scraper. Normally, scrapers only look at raw text. But modern websites (like your Next.js portfolio) are built with React and JavaScript, meaning the initial HTML page is often completely blank until the client-side code runs and "hydrates" it.
              </p>
              <p className="text-base text-gray-400 leading-relaxed">
                So, this scraper checks every site first:
                <br/><br/>
                <strong>1. Static Pages (Fast Mode):</strong> If it's a simple, old-school website (like WordPress or plain HTML), it grabs the code instantly using high-speed network requests. This takes fractions of a second.
                <br/><br/>
                <strong>2. Dynamic SPA (Playwright Mode):</strong> If it detects a modern, complex app (React, Vue, Angular, Next.js), it silently spins up a real, invisible headless Chromium browser. It waits for all background API calls and animations to finish, loads the dynamic content into the DOM, and even forcefully scrolls down the page incrementally to trick "lazy-loaded" images and infinite scrolls into rendering. This hybrid approach ensures you never get "blank" or dummy data.
              </p>
            </div>
          </section>

          <section className="scroll-mt-24">
            <h3 className="text-sm sm:text-base font-semibold text-gray-200 uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="text-teal-400 text-xl">🤖</span> The Deep Crawler & Route Discovery
            </h3>
            <div className="bg-white/[0.02] border border-white/[0.05] p-6 sm:p-8 rounded-3xl">
              <p className="text-base text-gray-400 leading-relaxed mb-6">
                Finding every page on a modern website is surprisingly hard because developers often hide links inside `onClick` events or load them dynamically. I built three strict safety nets to guarantee this crawler finds every corner of the target:
              </p>
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">The Blueprint Check</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">Before navigating the DOM, the scraper aggressively hunts down hidden `sitemap.xml` and `robots.txt` files that websites provide to Google. It parses these XML trees and queues up every single canonical page listed, entirely bypassing the need to "click" links.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Standard DOM Navigation</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">It executes a breadth-first search (BFS) algorithm through the site's DOM, clicking through every normalized `&lt;a href&gt;` connection it can find on the screen, crawling level by level up to your specified maximum depth.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">The "Ghost" Route Tracker (SPA Specific)</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">For modern sites utilizing "client-side routing" (where the URL changes without the browser actually reloading), links often don't exist as HTML elements. The scraper parses the raw Webpack/Next.js JavaScript bundles behind the scenes via AST (Abstract Syntax Tree) logic to extract the virtual `__NEXT_DATA__` routes that power the website internally.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="scroll-mt-24">
            <h3 className="text-sm sm:text-base font-semibold text-gray-200 uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="text-red-400 text-xl">🕵️</span> Comprehensive Extraction
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl transition-transform hover:-translate-y-1 duration-300">
                <h4 className="text-base font-bold text-white mb-3 flex items-center gap-3"><span className="text-2xl">🔓</span> Exposed Secrets</h4>
                <p className="text-sm text-gray-400 leading-relaxed">It hunts through both the DOM and raw JS payload for mistakes developers left behind. Using complex regex, it detects hard-coded Google Maps API Keys, AWS Access Tokens (AKIA/ASIA), Stripe Secrets, GitHub PATs, and generic credentials, highlighting exactly which endpoint leaked it.</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl transition-transform hover:-translate-y-1 duration-300">
                <h4 className="text-base font-bold text-white mb-3 flex items-center gap-3"><span className="text-2xl">🔧</span> Tech Stack Detective</h4>
                <p className="text-sm text-gray-400 leading-relaxed">It acts like a digital fingerprint expert, examining response headers, global window objects, scripts, and meta tags to tell you exactly how the website was built. It reliably identifies over 200+ technologies (e.g., React, Tailwind, Cloudflare, Shopify, Express).</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl transition-transform hover:-translate-y-1 duration-300">
                <h4 className="text-base font-bold text-white mb-3 flex items-center gap-3"><span className="text-2xl">🛡️</span> Security Auditing</h4>
                <p className="text-sm text-gray-400 leading-relaxed">It intercepts the silent HTTP headers the server sends back on every request. It alerts you if the site is missing critical protections like Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), or if it allows Cross-Origin embedding (X-Frame-Options), leaving them vulnerable.</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl transition-transform hover:-translate-y-1 duration-300">
                <h4 className="text-base font-bold text-white mb-3 flex items-center gap-3"><span className="text-2xl">📸</span> Pure DOM Targeting</h4>
                <p className="text-sm text-gray-400 leading-relaxed">It extracts a perfectly un-minified schema of all Semantic HTML: headings (H1-H6), unformatted paragraphs, imagery (with origin URLs & alt text), mailto/tel contacts, interconnected social media profiles, and hidden input/form fields across the entire depth structure.</p>
              </div>
            </div>
          </section>

          <section className="scroll-mt-24">
            <h3 className="text-sm sm:text-base font-semibold text-gray-200 uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="text-orange-400 text-xl">🔥</span> Brutal Mode
            </h3>
            <div className="bg-[#120a05] border border-orange-500/30 p-8 sm:p-10 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:bg-orange-500/20 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-red-500/10 blur-[60px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
              
              <div className="relative z-10">
                <h4 className="text-xl font-bold text-white mb-3">Total Reconnaissance</h4>
                <p className="text-base text-gray-300 leading-relaxed mb-6">
                  When you toggle "BRUTAL" mode, the scraper no longer acts like a politely browsing user. Instead of merely scraping hyperlinked, visible pages, it launches a brute-force directory fuzzing operation attempting to uncover architecture the developers actively tried to hide from the public internet.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm text-orange-200/80 font-mono bg-black/40 p-6 rounded-2xl border border-orange-500/20">
                  <div className="flex items-center gap-3"><span className="text-orange-500 animate-pulse">❯</span> Hunts for exposed `/.git/config`</div>
                  <div className="flex items-center gap-3"><span className="text-orange-500 animate-pulse">❯</span> Scans for `/.env` credential dumps</div>
                  <div className="flex items-center gap-3"><span className="text-orange-500 animate-pulse">❯</span> Uncovers `/wp-admin` & Dashboards</div>
                  <div className="flex items-center gap-3"><span className="text-orange-500 animate-pulse">❯</span> Seeks `backup.sql` & `.db` files</div>
                  <div className="flex items-center gap-3"><span className="text-orange-500 animate-pulse">❯</span> Probes `debug.log` & `error.log`</div>
                  <div className="flex items-center gap-3"><span className="text-orange-500 animate-pulse">❯</span> Checks common `/api/v1/users` routes</div>
                </div>
              </div>
            </div>
          </section>
          
        </div>
        
        <div className="mt-12 mb-8 flex justify-center sm:hidden">
          <button 
            onClick={() => navigate('/')}
            className="w-full justify-center flex items-center gap-2 px-4 py-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white rounded-xl transition-all font-medium"
          >
            ← Back to Scraper
          </button>
        </div>
        
      </div>
    </div>
  );
}
