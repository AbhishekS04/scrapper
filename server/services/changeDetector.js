/**
 * Change Detection Service
 * Monitors URLs for content changes on a configurable schedule.
 * Uses a content hash to detect changes and computes a diff of what changed.
 */
import crypto from 'crypto';
import * as cheerio from 'cheerio';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Fetch and extract visible text from a URL (lightweight — no Playwright needed)
 */
async function fetchText(url) {
  const response = await axios.get(url, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    maxRedirects: 5,
    validateStatus: (s) => s < 500,
  });

  const $ = cheerio.load(response.data);

  // Remove non-content elements
  $('script, style, noscript, head, nav, footer, iframe, svg, [aria-hidden="true"]').remove();

  // Extract text from meaningful elements
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Generate a SHA-256 hash of the page text for fast change detection
 */
export function hashContent(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Compute a human-readable diff between two text snapshots.
 * Returns added/removed sentence-level changes.
 */
export function computeDiff(oldText, newText) {
  if (!oldText) {
    return {
      hasChanges: true,
      summary: 'First snapshot captured — no previous content to compare.',
      added: [],
      removed: [],
      wordCountDelta: newText.split(/\s+/).length,
    };
  }

  // Split into sentences for comparison
  const splitSentences = (t) => t
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  const oldSentences = new Set(splitSentences(oldText));
  const newSentences = new Set(splitSentences(newText));

  const added = [...newSentences].filter(s => !oldSentences.has(s)).slice(0, 20);
  const removed = [...oldSentences].filter(s => !newSentences.has(s)).slice(0, 20);

  const oldWords = oldText.split(/\s+/).length;
  const newWords = newText.split(/\s+/).length;
  const wordCountDelta = newWords - oldWords;

  const hasChanges = added.length > 0 || removed.length > 0;

  let summary = '';
  if (!hasChanges) {
    summary = 'No meaningful content changes detected.';
  } else {
    const parts = [];
    if (added.length > 0) parts.push(`${added.length} new sentence(s) added`);
    if (removed.length > 0) parts.push(`${removed.length} sentence(s) removed`);
    if (wordCountDelta !== 0) parts.push(`word count changed by ${wordCountDelta > 0 ? '+' : ''}${wordCountDelta}`);
    summary = parts.join(', ') + '.';
  }

  return { hasChanges, summary, added, removed, wordCountDelta };
}

/**
 * Check a single monitor for changes.
 * Returns { changed, diff, newHash, newText }
 */
export async function checkMonitor(monitor) {
  const newText = await fetchText(monitor.url);
  const newHash = hashContent(newText);

  const changed = monitor.lastContentHash !== newHash;

  let diff = null;
  if (changed) {
    diff = computeDiff(monitor.lastSnapshotText, newText);
  }

  return { changed, diff, newHash, newText };
}

// ── In-memory scheduler ────────────────────────────────────────────────────
// Stores { monitorId -> intervalTimer } for active monitors
const activeTimers = new Map();

/**
 * Start the check loop for a monitor.
 * @param {object} monitor  DB row from monitors table
 * @param {function} onCheck   async (monitorId) => void — called each interval
 */
export function scheduleMonitor(monitor, onCheck) {
  if (activeTimers.has(monitor.id)) return; // already running

  const ms = (monitor.intervalMinutes || 60) * 60 * 1000;
  const timer = setInterval(() => {
    onCheck(monitor.id).catch(e => console.error(`Monitor ${monitor.id} check failed:`, e.message));
  }, ms);

  activeTimers.set(monitor.id, timer);
  console.log(`📡 Monitor ${monitor.id} scheduled every ${monitor.intervalMinutes}min`);
}

/**
 * Stop the check loop for a monitor.
 */
export function unscheduleMonitor(monitorId) {
  const timer = activeTimers.get(monitorId);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(monitorId);
    console.log(`🛑 Monitor ${monitorId} stopped`);
  }
}

export function getActiveTimerIds() {
  return [...activeTimers.keys()];
}
