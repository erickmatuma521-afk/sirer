import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get(
  '/statistics',
  requireAuth,
  [
    query('provinceId').optional().isUUID(),
    query('groupBy').optional().isIn(['province', 'type', 'status']),
    query('type').optional().isIn(['RETRAITE', 'RENTIER']),
    query('status').optional().isIn(['ACTIF', 'SUSPENDU', 'RADIE', 'EN_ATTENTE', 'INACTIF']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    // Unified filter logic
    const where = {};

    if (req.user?.role === 'AGENT_RECENSEMENT') {
      // Census agents always only see what they created
      where.createdById = req.user.id;
      // Filter by province unless they have global access
      if (!req.user.canAccessAllProvinces && req.user.provinceId) {
        where.provinceId = req.user.provinceId;
      }
    } else if (req.user?.role === 'AGENT_PROVINCIAL') {
      // Provincial agents see their whole province
      if (req.user.provinceId) where.provinceId = req.user.provinceId;
    }

    // Overwrite with specific query filter if provided (and authorized)
    if (req.query.provinceId) {
      // If agent is restricted, they can only filter within their province
      if (req.user?.role !== 'ADMIN_CENTRAL' && !req.user?.canAccessAllProvinces) {
        if (req.query.provinceId === req.user?.provinceId) {
          where.provinceId = req.query.provinceId;
        }
      } else {
        where.provinceId = req.query.provinceId;
      }
    }

    if (req.query.type) where.type = req.query.type;
    if (req.query.status) where.status = req.query.status;

    const groupBy = req.query.groupBy || 'province';
    let result;
    if (groupBy === 'province') {
      result = await prisma.beneficiary.groupBy({
        by: ['provinceId'],
        where,
        _count: true,
      });
      const provinces = await prisma.province.findMany();
      const map = Object.fromEntries(provinces.map(p => [p.id, { code: p.code, name: p.name }]));
      result = result.map(r => ({
        provinceId: r.provinceId,
        ...map[r.provinceId],
        total: r._count,
      }));
    } else if (groupBy === 'type') {
      result = await prisma.beneficiary.groupBy({
        by: ['type'],
        where,
        _count: true,
      });
      result = result.map(r => ({ type: r.type, count: r._count }));
    } else {
      result = await prisma.beneficiary.groupBy({
        by: ['status'],
        where,
        _count: true,
      });
      result = result.map(r => ({ status: r.status, count: r._count }));
    }
    res.json(result);
  }
);

router.get(
  '/beneficiaries-export',
  requireAuth,
  requireRole('ADMIN_CENTRAL', 'AGENT_PROVINCIAL', 'AGENT_RECENSEMENT'),
  [
    query('provinceId').optional().isUUID(),
    query('status').optional().isIn(['ACTIF', 'SUSPENDU', 'RADIE', 'EN_ATTENTE', 'INACTIF']),
    query('type').optional().isIn(['RETRAITE', 'RENTIER', 'AYANT_DROIT']),
    query('limit').optional().isInt({ min: 1, max: 5000 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Unified filter logic for export
    const where = {};
    if (req.user?.role === 'AGENT_RECENSEMENT') {
      where.createdById = req.user.id;
      if (!req.user.canAccessAllProvinces && req.user.provinceId) {
        where.provinceId = req.user.provinceId;
      }
    } else if (req.user?.role === 'AGENT_PROVINCIAL') {
      if (req.user.provinceId) where.provinceId = req.user.provinceId;
    }

    if (req.query.provinceId) {
      if (req.user?.role !== 'ADMIN_CENTRAL' && !req.user?.canAccessAllProvinces) {
        if (req.query.provinceId === req.user?.provinceId) where.provinceId = req.query.provinceId;
      } else {
        where.provinceId = req.query.provinceId;
      }
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    const limit = req.query.limit || 1000;
    const list = await prisma.beneficiary.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { province: true },
    });
    const { decrypt } = await import('../utils/crypto.js');
    const data = list.map(b => ({
      id: b.id,
      type: b.type,
      ayantDroitSubType: b.ayantDroitSubType,
      status: b.status,
      birthDate: b.birthDate,
      gender: b.gender,
      province: b.province?.name,
      nationalId: decrypt(b.nationalIdEncrypted),
      matricule: b.matricule,
      firstName: decrypt(b.firstNameEncrypted),
      lastName: decrypt(b.lastNameEncrypted),
      poursuitEtudes: b.poursuitEtudes,
      attestationExpiresAt: b.attestationExpiresAt,
      createdAt: b.createdAt,
    }));
    res.json({ data, total: data.length });
  }
);

export default router;
