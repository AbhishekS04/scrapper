import { Router } from 'express';
import { db } from '../services/db.js';
import { monitors } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getAuth } from '@clerk/express';
import {
  checkMonitor,
  scheduleMonitor,
  unscheduleMonitor,
} from '../services/changeDetector.js';

export const monitorRoutes = Router();

/**
 * Helper: run a check for a monitor and persist results to DB
 */
async function runCheck(monitorId) {
  const [monitor] = await db.select().from(monitors).where(eq(monitors.id, monitorId));
  if (!monitor || !monitor.isActive) return;

  try {
    const { changed, diff, newHash, newText } = await checkMonitor(monitor);

    const updateData = {
      lastCheckedAt: new Date(),
      lastContentHash: newHash,
      lastSnapshotText: newText.substring(0, 50000), // Store up to 50k chars
    };

    if (changed && diff?.hasChanges) {
      updateData.lastChangedAt = new Date();
      updateData.changeCount = (monitor.changeCount || 0) + 1;
      updateData.lastDiff = diff;
    }

    await db.update(monitors).set(updateData).where(eq(monitors.id, monitorId));
    console.log(`✅ Monitor check done: ${monitor.url} — changed: ${changed}`);
  } catch (err) {
    console.error(`❌ Monitor check failed for ${monitorId}:`, err.message);
  }
}

/**
 * GET /api/monitors — List all monitors for the current user
 */
monitorRoutes.get('/monitors', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await db.select().from(monitors).where(eq(monitors.userId, userId));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/monitors — Create a new monitor
 */
monitorRoutes.post('/monitors', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { url, label, intervalMinutes = 60 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Validate URL
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

    const [monitor] = await db.insert(monitors).values({
      userId,
      url,
      label: label || url,
      intervalMinutes: Math.max(5, parseInt(intervalMinutes) || 60),
      isActive: true,
    }).returning();

    // Run first check immediately in background
    runCheck(monitor.id).catch(() => {});
    // Schedule recurring checks
    scheduleMonitor(monitor, runCheck);

    res.status(201).json(monitor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/monitors/:id/check — Manually trigger a check
 */
monitorRoutes.post('/monitors/:id/check', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [monitor] = await db.select().from(monitors)
      .where(and(eq(monitors.id, req.params.id), eq(monitors.userId, userId)));

    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

    await runCheck(monitor.id);

    const [updated] = await db.select().from(monitors).where(eq(monitors.id, monitor.id));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/monitors/:id — Toggle active state or update interval
 */
monitorRoutes.patch('/monitors/:id', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [monitor] = await db.select().from(monitors)
      .where(and(eq(monitors.id, req.params.id), eq(monitors.userId, userId)));
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

    const updates = {};
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.intervalMinutes !== undefined) updates.intervalMinutes = Math.max(5, parseInt(req.body.intervalMinutes));
    if (req.body.label !== undefined) updates.label = req.body.label;

    const [updated] = await db.update(monitors).set(updates)
      .where(eq(monitors.id, monitor.id)).returning();

    // Re-schedule if interval changed or toggled
    unscheduleMonitor(monitor.id);
    if (updated.isActive) scheduleMonitor(updated, runCheck);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/monitors/:id — Delete a monitor
 */
monitorRoutes.delete('/monitors/:id', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await db.delete(monitors)
      .where(and(eq(monitors.id, req.params.id), eq(monitors.userId, userId)));

    unscheduleMonitor(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
