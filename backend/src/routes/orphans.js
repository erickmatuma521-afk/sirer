import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { registerAttestationEtudes } from '../services/orphanRules.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();

/** Enregistrer une attestation de poursuite d'études pour un orphelin 18+ → alerte programmée à 25 ans */
router.post(
  '/:beneficiaryId/attestation-etudes',
  requireAuth,
  requireRole('ADMIN_CENTRAL', 'AGENT_PROVINCIAL'),
  auditLog({ action: 'ATTESTATION_ETUDES', entity: 'Beneficiary' }),
  [body('attestationExpiresAt').optional().isISO8601()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: req.params.beneficiaryId },
    });
    if (!beneficiary) return res.status(404).json({ error: 'Bénéficiaire non trouvé' });
    if (req.user?.role !== 'ADMIN_CENTRAL' && req.user?.provinceId !== beneficiary.provinceId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    try {
      await registerAttestationEtudes(req.params.beneficiaryId, req.body.attestationExpiresAt);
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Erreur enregistrement attestation' });
    }
    const updated = await prisma.beneficiary.findUnique({
      where: { id: req.params.beneficiaryId },
      include: { province: true, alerts: true },
    });
    res.json(updated);
  }
);

/** Valider la suspension des avantages pour un orphelin 18+ qui ne poursuit pas les études */
router.post(
  '/:beneficiaryId/suspendre',
  requireAuth,
  requireRole('ADMIN_CENTRAL', 'AGENT_PROVINCIAL'),
  auditLog({ action: 'SUSPENSION_ORPHELIN_18', entity: 'Beneficiary' }),
  [body('decisionNote').optional().trim()],
  async (req, res) => {
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: req.params.beneficiaryId },
      include: { province: true },
    });
    if (!beneficiary) return res.status(404).json({ error: 'Bénéficiaire non trouvé' });
    if (beneficiary.type !== 'RENTIER' || beneficiary.ayantDroitSubType !== 'ORPHELIN') {
      return res.status(400).json({ error: 'Ce bénéficiaire n\'est pas un orphelin' });
    }
    if (req.user?.role !== 'ADMIN_CENTRAL' && req.user?.provinceId !== beneficiary.provinceId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    const birthDate = new Date(beneficiary.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    console.log(`Action suspension: User ${req.userId} (Role: ${req.user.role}, Prov: ${req.user.provinceId}) on Beneficiary ${beneficiary.id} (Prov: ${beneficiary.provinceId}, Type: ${beneficiary.type}/${beneficiary.ayantDroitSubType})`);
    
    const isAdmin = req.userRole === 'ADMIN_CENTRAL';
    
    if (age < 18 && !isAdmin) {
      console.log(`Echec suspension : age insuffisant (${age}) pour ID ${beneficiary.id}`);
      return res.status(400).json({ error: `Suspension possible uniquement à partir de 18 ans (âge actuel : ${age} ans). Seul l'Administrateur Central peut passer outre cette limite.` });
    }

    try {
      await prisma.$transaction([
        prisma.suspensionHistory.create({
          data: {
            beneficiaryId: beneficiary.id,
            reason: 'MAJORITE_18_SANS_ETUDES',
            effectiveAt: new Date(),
            decidedBy: req.userId,
            decisionNote: req.body.decisionNote || 'Suspension après validation administrative (pas de poursuite d\'études).',
          },
        }),
        prisma.beneficiary.update({
          where: { id: req.params.beneficiaryId },
          data: { status: 'SUSPENDU', poursuitEtudes: false },
        }),
      ]);
      console.log(`Suspension réussie (DB updated) pour ${beneficiary.id}`);
    } catch (dbErr) {
      console.error(`Erreur DB lors de la suspension de ${beneficiary.id}:`, dbErr);
      throw dbErr;
    }

    await prisma.alert.updateMany({
      where: {
        beneficiaryId: req.params.beneficiaryId,
        type: 'ORPHELIN_18_ANS',
        status: 'OUVERTE',
      },
      data: {
        status: 'RESOLUE',
        resolvedById: req.userId,
        resolvedAt: new Date(),
        resolutionNote: 'Suspension validée (pas de poursuite d\'études).',
      },
    });

    // Créer une nouvelle alerte de suspension pour information (Admin Central et Agent)
    await prisma.alert.create({
      data: {
        beneficiaryId: req.params.beneficiaryId,
        type: 'SUSPENSION_PREVUE',
        status: 'OUVERTE',
        title: `Suspension : ${beneficiary.lastName} ${beneficiary.firstName}`,
        description: `L'orphelin a été suspendu pour arrêt d'études. Une revue par l'Administrateur Central est requise pour clôturer définitivement le dossier.`,
        dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 7 jours pour traiter
      }
    });

    const updated = await prisma.beneficiary.findUnique({
      where: { id: req.params.beneficiaryId },
      include: { province: true },
    });
    res.json(updated);
  }
);

export default router;
