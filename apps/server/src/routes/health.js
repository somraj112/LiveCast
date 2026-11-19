import express from 'express';
import prisma from '../config/db.js';
import { infrastructure } from '../infrastructure/store.js';

const router = express.Router();
let draining = false;
export function markDraining() { draining = true; }

router.get(['/health', '/health/live'], (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running.',
  });
});
router.get('/health/ready', async (_req, res) => {
  if (draining) return res.status(503).json({ success: false, status: 'draining' });
  let timeout;
  try {
    await Promise.race([
      Promise.all([prisma.$queryRaw`SELECT 1`, infrastructure.ping()]),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Readiness timeout')), 3000); }),
    ]);
    return res.json({ success: true, status: 'ready' });
  } catch { return res.status(503).json({ success: false, status: 'unavailable' }); }
  finally { clearTimeout(timeout); }
});

export default router;
