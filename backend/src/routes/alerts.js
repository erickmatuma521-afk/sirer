import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { decrypt } from '../utils/crypto.js';

const router = Router();

function mapAlertWithDecryptedBeneficiary(a) {
  const b = a.beneficiary;
  if (!b) return a;
  return {
    ...a,
    beneficiary: {
      ...b,
      firstName: decrypt(b.firstNameEncrypted),
      lastName: decrypt(b.lastNameEncrypted),
      firstNameEncrypted: undefined,
      lastNameEncrypted: undefined,
      nationalIdEncrypted: undefined,
      addressEncrypted: undefined,
      phoneEncrypted: undefined,
      emailEncrypted: undefined,
    },
    createdBy: a.createdBy ? { fullName: a.createdBy.fullName || a.createdBy.email || 'Agent Inconnu' } : null,
  };
}

router.post('/', requireAuth, [
  body('beneficiaryId').isUUID(),
  body('type').notEmpty().trim(),
  body('title').notEmpty().trim(),
  body('description').optional().trim(),
  body('metadata').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const alert = await prisma.alert.create({
    data: {
      beneficiaryId: req.body.beneficiaryId,
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      metadata: req.body.metadata,
      createdById: req.userId,
      status: 'OUVERTE',
    },
    include: { beneficiary: { include: { province: true } }, createdBy: true },
  });

  res.status(201).json(mapAlertWithDecryptedBeneficiary(alert));
});

router.get('/', requireAuth, [
  query('status').optional().isIn(['OUVERTE', 'EN_COURS', 'RESOLUE', 'IGNOREE']),
  query('type').optional().isString(),
  query('provinceId').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const page = req.query.page || 1;
  const limit = req.query.limit || 50;
  const where = {};
  if (req.user?.role !== 'ADMIN_CENTRAL' && req.user?.provinceId) {
    where.beneficiary = { provinceId: req.user.provinceId };
  }
  if (req.query.provinceId) where.beneficiary = { ...where.beneficiary, provinceId: req.query.provinceId };
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;
  const [raw, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { beneficiary: { include: { province: true } }, createdBy: true },
    }),
    prisma.alert.count({ where }),
  ]);
  const data = raw.map(mapAlertWithDecryptedBeneficiary);
  res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
});

router.patch('/:id/resolve', requireAuth, requireRole('ADMIN_CENTRAL', 'AGENT_PROVINCIAL'), [
  body('resolutionNote').optional().trim(),
  body('blockBeneficiary').optional().isBoolean(),
], async (req, res) => {
  const alert = await prisma.alert.findUnique({
    where: { id: req.params.id },
    include: { beneficiary: true },
  });
  if (!alert) return res.status(404).json({ error: 'Alerte non trouvée' });
  if (req.user?.role !== 'ADMIN_CENTRAL' && req.user?.provinceId !== alert.beneficiary.provinceId) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
  if (req.body?.blockBeneficiary === true) {
    if (req.user?.role !== 'ADMIN_CENTRAL') return res.status(403).json({ error: 'Seul l\'Administrateur Central peut bloquer un bénéficiaire' });
    await prisma.beneficiary.update({
      where: { id: alert.beneficiaryId },
      data: { status: 'INACTIF' }
    });
  }

  const updated = await prisma.alert.update({
    where: { id: req.params.id },
    data: {
      status: 'RESOLUE',
      resolvedById: req.userId,
      resolvedAt: new Date(),
      resolutionNote: req.body?.resolutionNote || (req.body?.blockBeneficiary ? 'Signalement résolu avec mise en inactivité' : null),
    },
    include: { beneficiary: { include: { province: true } }, resolvedBy: true },
  });
  res.json(updated);
});

router.patch('/:id/report', requireAuth, async (req, res) => {
  const alert = await prisma.alert.findUnique({
    where: { id: req.params.id },
    include: { beneficiary: true },
  });
  if (!alert) return res.status(404).json({ error: 'Alerte non trouvée' });
  if (req.user?.role === 'ADMIN_CENTRAL') return res.status(400).json({ error: 'L\'Administrateur Central ne peut pas se signaler lui-même' });
  
  if (req.user?.provinceId !== alert.beneficiary.provinceId && !req.user?.canAccessAllProvinces) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  const updated = await prisma.alert.update({
    where: { id: req.params.id },
    data: { isReported: true },
  });
  res.json(updated);
});

export default router;
