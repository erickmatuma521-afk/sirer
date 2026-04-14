import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { runOrphanAlertsAndSuspensions } from '../services/orphanRules.js';

const router = Router();

/** Déclencher manuellement les règles orphelins (admin central uniquement, ex: pour tests) */
router.post('/run-orphan-rules', requireAuth, requireRole('ADMIN_CENTRAL'), async (req, res) => {
  try {
    const result = await runOrphanAlertsAndSuspensions();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erreur exécution règles orphelins' });
  }
});

export default router;
