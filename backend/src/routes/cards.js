import { Router } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { hashForVerification } from '../utils/crypto.js';
import { decrypt } from '../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// const CARD_VALIDITY_YEARS = 5; // Supprimé au profit d'une logique dynamique

router.post('/generate/:beneficiaryId', requireAuth, requireRole('ADMIN_CENTRAL', 'AGENT_PROVINCIAL', 'AGENT_RECENSEMENT'), async (req, res) => {
  const beneficiary = await prisma.beneficiary.findUnique({
    where: { id: req.params.beneficiaryId },
    include: { province: true },
  });
  if (!beneficiary) return res.status(404).json({ error: 'Bénéficiaire non trouvé' });
  if (beneficiary.status !== 'ACTIF') {
    return res.status(400).json({ error: 'Seuls les bénéficiaires actifs peuvent recevoir une carte' });
  }
  // Suppression de la restriction de province pour permettre à tout agent de générer une carte
  // if (req.user?.role !== 'ADMIN_CENTRAL' && req.user?.provinceId !== beneficiary.provinceId) {
  //   return res.status(403).json({ error: 'Accès non autorisé' });
  // }

  const expiresAt = new Date();
  let validityYears = 2; // Défaut pour Retraité, Veuve, Veuf
  if (beneficiary.type === 'RENTIER' && beneficiary.ayantDroitSubType === 'ORPHELIN') {
    validityYears = 5;
  }
  expiresAt.setFullYear(expiresAt.getFullYear() + validityYears);
  const cardNumber = `SIRER-${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16)}`;
  const payload = `${beneficiary.id}|${expiresAt.toISOString()}|${cardNumber}`;
  const signature = hashForVerification(payload);
  const qrCodePayload = `${payload}|${signature}`;

  const card = await prisma.card.create({
    data: {
      beneficiaryId: beneficiary.id,
      cardNumber,
      qrCodePayload,
      expiresAt,
    },
    include: { beneficiary: true },
  });

  let qrDataUrl;
  try {
    qrDataUrl = await QRCode.toDataURL(qrCodePayload, { width: 256, margin: 2 });
  } catch (e) {
    qrDataUrl = null;
  }

  res.json({
    card: {
      id: card.id,
      cardNumber: card.cardNumber,
      expiresAt: card.expiresAt,
      issuedAt: card.issuedAt,
    },
    qrCodeDataUrl: qrDataUrl,
    beneficiaryId: beneficiary.id,
    beneficiary: {
      firstName: decrypt(beneficiary.firstNameEncrypted),
      lastName: decrypt(beneficiary.lastNameEncrypted),
      birthDate: beneficiary.birthDate,
      type: beneficiary.type,
      province: beneficiary.province?.name,
      photoData: beneficiary.photoData || null,
    },
  });
});

router.get('/beneficiary/:beneficiaryId', requireAuth, async (req, res) => {
  const cards = await prisma.card.findMany({
    where: {
      beneficiaryId: req.params.beneficiaryId,
      isRevoked: false,
    },
    orderBy: { issuedAt: 'desc' },
  });
  if (req.user?.role !== 'ADMIN_CENTRAL') {
    const b = await prisma.beneficiary.findUnique({
      where: { id: req.params.beneficiaryId },
    });
    // Permission à tout agent de voir les cartes
    // if (!b || b.provinceId !== req.user?.provinceId) return res.status(403).json({ error: 'Accès non autorisé' });
  }
  res.json(cards.map(c => ({
    id: c.id,
    cardNumber: c.cardNumber,
    expiresAt: c.expiresAt,
    issuedAt: c.issuedAt,
    isRevoked: c.isRevoked,
    qrCodePayload: c.qrCodePayload,
  })));
});

router.post('/:id/revoke', requireAuth, requireRole('ADMIN_CENTRAL', 'AGENT_PROVINCIAL'), async (req, res) => {
  const card = await prisma.card.findUnique({
    where: { id: req.params.id },
    include: { beneficiary: true },
  });
  if (!card) return res.status(404).json({ error: 'Carte non trouvée' });
  if (req.user?.role !== 'ADMIN_CENTRAL' && req.user?.provinceId !== card.beneficiary.provinceId) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
  await prisma.card.update({
    where: { id: req.params.id },
    data: { isRevoked: true },
  });
  res.json({ success: true });
});

router.post('/verify', requireAuth, requireRole('ADMIN_CENTRAL'), async (req, res) => {
  const { qrPayload } = req.body;
  if (!qrPayload) return res.status(400).json({ error: 'Payload QR manquant' });

  const parts = qrPayload.split('|');
  if (parts.length !== 4) return res.status(400).json({ error: 'Format QR invalide' });

  const [beneficiaryId, expiresAtStr, cardNumber, signature] = parts;
  const payloadToSign = `${beneficiaryId}|${expiresAtStr}|${cardNumber}`;
  const expectedSignature = hashForVerification(payloadToSign);

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Signature QR invalide (carte potentiellement falsifiée)' });
  }

  const expiresAt = new Date(expiresAtStr);
  if (expiresAt < new Date()) {
    return res.status(400).json({ error: 'Cette carte a expiré' });
  }

  const card = await prisma.card.findUnique({
    where: { cardNumber },
    include: {
      beneficiary: {
        include: { province: true }
      }
    }
  });

  if (!card) return res.status(404).json({ error: 'Carte non trouvée dans la base de données' });
  if (card.isRevoked) return res.status(400).json({ error: 'Cette carte a été révoquée' });
  if (card.beneficiary.status === 'INACTIF') return res.status(400).json({ error: 'Ce bénéficiaire est marqué comme INACTIF dans le système' });
  if (card.beneficiaryId !== beneficiaryId) return res.status(400).json({ error: 'Incohérence de données' });

  const b = card.beneficiary;
  res.json({
    cardNumber: card.cardNumber,
    expiresAt: card.expiresAt,
    beneficiary: {
      id: b.id,
      nationalId: decrypt(b.nationalIdEncrypted),
      firstName: decrypt(b.firstNameEncrypted),
      lastName: decrypt(b.lastNameEncrypted),
      birthDate: b.birthDate,
      gender: b.gender,
      type: b.type,
      status: b.status,
      province: b.province?.name,
      photoData: b.photoData,
      matricule: b.matricule,
    }
  });
});

export default router;
