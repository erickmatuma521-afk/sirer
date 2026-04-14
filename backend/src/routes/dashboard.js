import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/stats', requireAuth, async (req, res) => {
  const provinceFilter = req.user?.role !== 'ADMIN_CENTRAL'
    ? { createdById: req.userId }
    : {};

  const isAdmin = req.user?.role === 'ADMIN_CENTRAL';

  const [
    totalBeneficiaries,
    actifs,
    suspendusDb,
    alertesSuspension,
    parType,
    parProvince,
    alertesOuvertes,
    totalUsers,
  ] = await Promise.all([
    prisma.beneficiary.count({ where: provinceFilter }),
    prisma.beneficiary.count({ where: { ...provinceFilter, status: 'ACTIF' } }),
    prisma.beneficiary.count({ where: { ...provinceFilter, status: { in: ['SUSPENDU', 'INACTIF'] } } }),
    prisma.alert.count({
      where: {
        status: 'OUVERTE',
        ...(isAdmin 
          ? { isReported: true } 
          : { 
              type: 'ORPHELIN_18_ANS', 
              beneficiary: { createdById: req.userId } 
            }),
      }
    }),
    prisma.beneficiary.groupBy({
      by: ['type'],
      where: provinceFilter,
      _count: true,
    }),
    prisma.beneficiary.groupBy({
      by: ['provinceId'],
      where: provinceFilter,
      _count: true,
    }),
    prisma.alert.count({
      where: {
        status: 'OUVERTE',
        ...(!isAdmin && req.user?.provinceId
          ? { beneficiary: { provinceId: req.user.provinceId } }
          : {}),
      },
    }),
    isAdmin ? prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }) : Promise.resolve(undefined),
  ]);

  const provinces = await prisma.province.findMany();
  const provinceMap = Object.fromEntries(provinces.map(p => [p.id, p.name]));

  res.json({
    totalBeneficiaries,
    actifs,
    suspendus: suspendusDb + (alertesSuspension || 0),
    inactifs: totalBeneficiaries - actifs,
    parType: Object.fromEntries(parType.map(t => [t.type, t._count])),
    parProvince: parProvince.map(p => ({
      provinceId: p.provinceId,
      provinceName: provinceMap[p.provinceId] || p.provinceId,
      count: p._count,
    })),
    alertesOuvertes,
    totalUsers,
  });
});

export default router;
