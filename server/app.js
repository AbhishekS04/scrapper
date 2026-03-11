/**
 * Express app setup — shared by both local dev (index.js) and Vercel serverless (api/index.js)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env only in non-Vercel environments (Vercel uses dashboard env vars)
if (!process.env.VERCEL) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

import express from 'express';
import cors from 'cors';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { scrapeRoutes } from './routes/scrape.js';
import { jobsRoutes } from './routes/jobs.js';
import { exportRoutes } from './routes/export.js';
import { searchRoutes } from './routes/search.js';
import { monitorRoutes } from './routes/monitors.js';
import { proxyRoutes } from './routes/proxy.js';

const app = express();

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (SSE, server-to-server, curl)
    if (!origin) return cb(null, true);
    // Allow any Vercel preview/production domain
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(null, true); // permissive for now — tighten in production
  },
  credentials: true,
}));
app.use(express.json());

// Clerk authentication middleware
app.use(clerkMiddleware());

// Rate limiting - simple in-memory tracker
const activeJobs = new Map();
const MAX_CONCURRENT_JOBS = 5;

app.use('/api', (req, res, next) => {
  req.activeJobs = activeJobs;
  req.MAX_CONCURRENT_JOBS = MAX_CONCURRENT_JOBS;
  next();
});

// Routes
app.use('/api', scrapeRoutes);
app.use('/api', jobsRoutes);
app.use('/api', exportRoutes);
app.use('/api', searchRoutes);
app.use('/api', monitorRoutes);
app.use('/api', proxyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.VERCEL ? 'vercel' : 'local' });
});

export default app;
