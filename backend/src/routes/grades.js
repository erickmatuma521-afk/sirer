import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const list = await prisma.grade.findMany({ orderBy: { name: 'asc' } });
  res.json(list);
});

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN_CENTRAL'),
  auditLog({ action: 'CREATE', entity: 'Grade', captureBody: true }),
  [body('name').notEmpty().trim(), body('grossSalary').isFloat({ min: 0 }).toFloat()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides' });
    try {
      const created = await prisma.grade.create({
        data: { name: req.body.name, grossSalary: req.body.grossSalary },
      });
      res.status(201).json(created);
    } catch (err) {
      const message = err.code === 'P2002' ? 'Ce grade existe déjà.' : (err.message || 'Erreur serveur');
      res.status(500).json({ error: message });
    }
  }
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN_CENTRAL'),
  auditLog({ action: 'UPDATE', entity: 'Grade', captureBody: true }),
  [param('id').isUUID(), body('name').optional().trim(), body('grossSalary').optional().isFloat({ min: 0 }).toFloat()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides' });
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.grossSalary !== undefined) updates.grossSalary = req.body.grossSalary;
    try {
      const updated = await prisma.grade.update({ where: { id: req.params.id }, data: updates });
      res.json(updated);
    } catch (err) {
      const message = err.code === 'P2025' ? 'Grade introuvable.' : (err.code === 'P2002' ? 'Ce grade existe déjà.' : (err.message || 'Erreur serveur'));
      res.status(500).json({ error: message });
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN_CENTRAL'),
  auditLog({ action: 'DELETE', entity: 'Grade', captureBody: false }),
  [param('id').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides' });
    try {
      await prisma.grade.delete({ where: { id: req.params.id } });
      res.json({ message: 'Supprimé' });
    } catch (err) {
      const message = err.code === 'P2003' ? 'Ce grade est utilisé par des bénéficiaires.' : (err.code === 'P2025' ? 'Grade introuvable.' : (err.message || 'Erreur serveur'));
      res.status(500).json({ error: message });
    }
  }
);

export default router;

