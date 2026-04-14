import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRole('ADMIN_CENTRAL'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('entity').optional().isString(),
    query('action').optional().isString(),
    query('userId').optional().isUUID(),
    query('beneficiaryId').optional().isUUID(),
    query('date').optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const page = req.query.page || 1;
    const limit = req.query.limit || 50;
    const where = {};
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.action) where.action = req.query.action;
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.beneficiaryId) where.beneficiaryId = req.query.beneficiaryId;
    if (req.query.date) {
      const startOfDay = new Date(req.query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(req.query.date);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  }
);

router.delete(
  '/',
  requireAuth,
  requireRole('ADMIN_CENTRAL'),
  async (req, res) => {
    try {
      await prisma.auditLog.deleteMany({});
      res.json({ message: 'Journal d\'audit vidé avec succès' });
    } catch (err) {
      console.error('Clear audit log error:', err);
      res.status(500).json({ error: 'Erreur lors de la suppression du journal' });
    }
  }
);

export default router;
