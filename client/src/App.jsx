import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react';
import Home from './pages/Home.jsx';
import History from './pages/History.jsx';

function NavBar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center group-hover:border-white/[0.2] transition-all duration-300">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <span className="text-base sm:text-lg font-bold tracking-wide text-white">
            Scrape<span className="text-gray-400">It</span>
          </span>
        </Link>

        {/* Center nav links — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          <SignedIn>
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === '/'
                  ? 'text-white bg-white/[0.1]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Scraper
            </Link>
            <Link
              to="/history"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === '/history'
                  ? 'text-white bg-white/[0.1]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              History
            </Link>
          </SignedIn>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all duration-200">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn-primary text-xs py-2 px-3 sm:px-4">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-7 h-7 sm:w-8 sm:h-8',
                },
              }}
            />
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                }
              </svg>
            </button>
          </SignedIn>
        </div>
      </div>

      {/* Mobile dropdown */}
      <SignedIn>
        <div className={`sm:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-40 border-t border-white/[0.06]' : 'max-h-0'}`}>
          <div className="px-4 py-3 flex flex-col gap-1 bg-dark-950/95 backdrop-blur-xl">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === '/'
                  ? 'text-white bg-white/[0.1]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Scraper
            </Link>
            <Link
              to="/history"
              onClick={() => setMobileOpen(false)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === '/history'
                  ? 'text-white bg-white/[0.1]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              History
            </Link>
          </div>
        </div>
      </SignedIn>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-950 grid-bg">
        <NavBar />
        <main className="pt-14 sm:pt-16">
          <SignedIn>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </SignedIn>
          <SignedOut>
            <LandingPage />
          </SignedOut>
        </main>
      </div>
    </BrowserRouter>
  );
}

function LandingPage() {
  return (
    <div className="relative flex flex-col items-center justify-center pt-12 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-6 animate-fade-in">
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo badge */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight text-center mb-3 sm:mb-4">
          <span className="text-white">Scrape</span>
          <span className="text-gray-500">It</span>
        </h1>

        <p className="text-gray-400 text-sm sm:text-lg md:text-xl mb-2 text-center max-w-2xl px-2">
          Web intelligence & data extraction platform
        </p>
        <p className="text-gray-600 text-xs sm:text-sm mb-6 sm:mb-8 text-center max-w-lg px-2">
          Extract links, images, metadata, contacts, tech stack, security headers, scripts, and more.
        </p>

        <div className="flex items-center gap-3 sm:gap-4">
          <SignInButton mode="modal">
            <button className="btn-primary">
              Sign In to Get Started
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="btn-secondary">
              Create Account
            </button>
          </SignUpButton>
        </div>

        {/* Feature cards */}
        <div className="mt-10 sm:mt-16 max-w-4xl w-full grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: '⚡', title: 'Lightning Fast', desc: 'Smart engine: Axios for static pages, Playwright for JS-heavy sites.' },
            { icon: '🔓', title: 'Leak Detection', desc: 'High-accuracy scan for exposed API keys, tokens, passwords, AWS secrets.' },
            { icon: '🛡️', title: 'Security Audit', desc: 'Check HTTP security headers, CSP, HSTS, and vulnerability indicators.' },
            { icon: '📊', title: 'Full Extraction', desc: 'Links, images, scripts, forms, tables, contacts, metadata, tech stack.' },
          ].map(card => (
            <div key={card.title} className="glass-panel-hover p-4 sm:p-5 group/card">
              <div className="text-xl sm:text-2xl mb-2 sm:mb-3 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white/[0.04]">{card.icon}</div>
              <h3 className="text-white font-semibold mb-1 sm:mb-1.5 text-xs sm:text-sm">{card.title}</h3>
              <p className="text-gray-500 text-[10px] sm:text-xs leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
