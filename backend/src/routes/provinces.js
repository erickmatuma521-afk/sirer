import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const list = await prisma.province.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(list);
});

export default router;
