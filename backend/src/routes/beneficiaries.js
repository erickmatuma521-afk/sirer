import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { encrypt, decrypt, hashForVerification } from '../utils/crypto.js';
import { normalizeSearch } from '../utils/normalize.js';

const router = Router();

// Verification publique par matricule (Portal Bénéficiaire)
router.get('/public/verify/:matricule', async (req, res) => {
  try {
    const b = await prisma.beneficiary.findUnique({
      where: { matricule: req.params.matricule },
      include: { province: true, grade: true }
    });
    if (!b) return res.status(404).json({ error: 'Non trouvé' });
    res.json(decryptBeneficiary(b));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

function decryptBeneficiary(b) {
  return {
    ...b,
    nationalId: decrypt(b.nationalIdEncrypted),
    firstName: decrypt(b.firstNameEncrypted),
    lastName: decrypt(b.lastNameEncrypted),
    address: b.addressEncrypted ? decrypt(b.addressEncrypted) : null,
    phone: b.phoneEncrypted ? decrypt(b.phoneEncrypted) : null,
    email: b.emailEncrypted ? decrypt(b.emailEncrypted) : null,
    bank: b.bankEncrypted ? decrypt(b.bankEncrypted) : null,
    institution: b.institutionEncrypted ? decrypt(b.institutionEncrypted) : null,
    photoData: b.photoData || null,
    fingerprintData: b.fingerprintData || null,
    matricule: b.matricule || null,
    nationalIdEncrypted: undefined,
    firstNameEncrypted: undefined,
    lastNameEncrypted: undefined,
    addressEncrypted: undefined,
    phoneEncrypted: undefined,
    emailEncrypted: undefined,
    bankEncrypted: undefined,
    institutionEncrypted: undefined,
    isPaid: b.isPaid,
    paymentAmount: b.paymentAmount,
  };
}

function canAccessProvince(user, provinceId) {
  if (!user) return false;
  if (user.role === 'ADMIN_CENTRAL' || user.canAccessAllProvinces) return true;
  return user.provinceId === provinceId;
}

router.get(
  '/',
  requireAuth,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['ACTIF', 'SUSPENDU', 'RADIE', 'EN_ATTENTE', 'INACTIF']),
    query('type').optional().isIn(['RETRAITE', 'RENTIER']),
    query('provinceId').optional().isUUID(),
    query('search').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const skip = (page - 1) * limit;
    const where = {};
    if (req.user?.role !== 'ADMIN_CENTRAL') {
      where.createdById = req.userId;
      if (req.user?.provinceId && !req.user?.canAccessAllProvinces) where.provinceId = req.user.provinceId;
    }
    if (req.query.provinceId) {
      if (!canAccessProvince(req.user, req.query.provinceId)) return res.status(403).json({ error: 'Province non autorisée' });
      where.provinceId = req.query.provinceId;
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    if (req.query.search) {
      const s = normalizeSearch(req.query.search);
      where.OR = [
        { matricule: { contains: req.query.search } },
        { firstNameSearch: { contains: s } },
        { lastNameSearch: { contains: s } },
      ];
    }
    const [list, total] = await Promise.all([
      prisma.beneficiary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { province: true, titulaire: true, grade: true },
      }),
      prisma.beneficiary.count({ where }),
    ]);
    res.json({
      data: list.map(decryptBeneficiary),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }
);


router.get('/:id', requireAuth, async (req, res) => {
  const b = await prisma.beneficiary.findUnique({
    where: { id: req.params.id },
    include: { province: true, titulaire: true, documents: true, alerts: true, grade: true },
  });
  if (!b) return res.status(404).json({ error: 'Bénéficiaire non trouvé' });
  // On autorise la consultation de la fiche par tout utilisateur authentifié
  // if (!canAccessProvince(req.user, b.provinceId)) return res.status(403).json({ error: 'Accès non autorisé' });
  res.json(decryptBeneficiary(b));
});

// Sanitize optional body fields: empty string -> undefined (évite erreurs de validation)
function sanitizeOptionalBody(req, res, next) {
  const optional = ['ayantDroitSubType', 'titulaireId', 'address', 'phone', 'email', 'bank', 'institution', 'gradeId', 'poursuitEtudes', 'attestationEtudesAt', 'attestationExpiresAt', 'photoData', 'fingerprintData', 'matricule', 'paymentAmount'];
  optional.forEach((key) => {
    if (req.body[key] === '' || req.body[key] === null) req.body[key] = undefined;
  });
  if (req.body.poursuitEtudes === 'true') req.body.poursuitEtudes = true;
  if (req.body.poursuitEtudes === 'false') req.body.poursuitEtudes = false;
  if (req.body.isPaid === 'true') req.body.isPaid = true;
  if (req.body.isPaid === 'false') req.body.isPaid = false;
  if (req.body.paymentAmount) req.body.paymentAmount = parseFloat(req.body.paymentAmount);
  next();
}

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN_CENTRAL', 'AGENT_PROVINCIAL', 'AGENT_RECENSEMENT'),
  sanitizeOptionalBody,
  auditLog({ action: 'CREATE', entity: 'Beneficiary', captureBody: false }),
  [
    body('nationalId').notEmpty().trim(),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('birthDate').isISO8601(),
    body('gender').isIn(['M', 'F']),
    body('type').isIn(['RETRAITE', 'RENTIER']),
    body('provinceId').notEmpty().isUUID(),
    body('ayantDroitSubType').optional().isIn(['VEUF', 'VEUVE', 'ORPHELIN']),
    body('titulaireId').optional().isUUID(),
    body('address').optional().trim(),
    body('phone').optional().trim(),
    body('email').optional().trim().isEmail(),
    body('poursuitEtudes').optional().isBoolean(),
    body('attestationEtudesAt').optional().isISO8601(),
    body('attestationExpiresAt').optional().isISO8601(),
    body('photoData').optional().isString(),
    body('fingerprintData').optional().isString(),
    body('matricule').optional().trim(),
    body('bank').optional().trim(),
    body('institution').optional().trim(),
    body('gradeId').optional().isUUID(),
    body('isPaid').optional().isBoolean(),
    body('paymentAmount').optional().isFloat(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array().map((e) => e.msg || `${e.path}: invalide`).join('. ');
      return res.status(400).json({ error: msg });
    }
    if (!canAccessProvince(req.user, req.body.provinceId)) {
      return res.status(403).json({ error: 'Province non autorisée' });
    }
    if (!req.userId) return res.status(401).json({ error: 'Non authentifié' });

    const rawAttestationExp = req.body.attestationExpiresAt;
    const attestationExpiresAtDate = rawAttestationExp && String(rawAttestationExp).trim() ? new Date(rawAttestationExp) : null;
    const rawAttestationAt = req.body.attestationEtudesAt;
    const attestationEtudesAtDate = rawAttestationAt && String(rawAttestationAt).trim() ? new Date(rawAttestationAt) : null;

    const nationalIdTrimmed = String(req.body.nationalId).trim();
    const matriculeTrimmed = req.body.matricule ? String(req.body.matricule).trim() : null;
    const nationalIdHash = hashForVerification(nationalIdTrimmed);

    try {
      // Vérification d'unicité manuelle pour message d'erreur clair
      const existing = await prisma.beneficiary.findFirst({
        where: {
          OR: [
            { matricule: matriculeTrimmed && matriculeTrimmed !== '' ? matriculeTrimmed : undefined },
            { nationalIdHash: nationalIdHash }
          ].filter(c => c !== undefined && Object.values(c)[0] !== undefined)
        }
      });

      if (existing) {
        if (matriculeTrimmed && existing.matricule === matriculeTrimmed) {
          return res.status(400).json({ error: `Le numéro matricule ${matriculeTrimmed} est déjà utilisé.` });
        }
        return res.status(400).json({ error: `Le numéro de pièce d'identité ${nationalIdTrimmed} est déjà enregistré.` });
      }

      const data = {
        nationalIdEncrypted: encrypt(nationalIdTrimmed),
        nationalIdHash: nationalIdHash,
        firstNameEncrypted: encrypt(String(req.body.firstName).trim()),
        lastNameEncrypted: encrypt(String(req.body.lastName).trim()),
        birthDate: new Date(req.body.birthDate),
        gender: req.body.gender,
        type: req.body.type,
        provinceId: req.body.provinceId,
        gradeId: req.body.gradeId || null,
        createdById: req.userId,
        addressEncrypted: req.body.address && String(req.body.address).trim() ? encrypt(req.body.address.trim()) : null,
        phoneEncrypted: req.body.phone && String(req.body.phone).trim() ? encrypt(req.body.phone.trim()) : null,
        emailEncrypted: req.body.email && String(req.body.email).trim() ? encrypt(req.body.email.trim()) : null,
        bankEncrypted: req.body.bank && String(req.body.bank).trim() ? encrypt(req.body.bank.trim()) : null,
        institutionEncrypted: req.body.institution && String(req.body.institution).trim() ? encrypt(req.body.institution.trim()) : null,
        ayantDroitSubType: req.body.type === 'RENTIER' && req.body.ayantDroitSubType ? req.body.ayantDroitSubType : null,
        titulaireId: req.body.titulaireId && String(req.body.titulaireId).trim() ? req.body.titulaireId : null,
        poursuitEtudes: req.body.poursuitEtudes === true || req.body.poursuitEtudes === 'true' ? true : req.body.poursuitEtudes === false || req.body.poursuitEtudes === 'false' ? false : null,
        attestationEtudesAt: attestationEtudesAtDate,
        attestationExpiresAt: attestationExpiresAtDate,
        photoData: req.body.photoData && String(req.body.photoData).trim().startsWith('data:') ? req.body.photoData.trim() : null,
        fingerprintData: req.body.fingerprintData && String(req.body.fingerprintData).trim() ? req.body.fingerprintData.trim() : null,
        matricule: matriculeTrimmed,
        isPaid: req.body.isPaid === true,
        paymentAmount: req.body.isPaid ? req.body.paymentAmount : null,
        firstNameSearch: normalizeSearch(req.body.firstName),
        lastNameSearch: normalizeSearch(req.body.lastName),
      };

      if (req.body.documents && Array.isArray(req.body.documents)) {
        data.documents = {
          create: req.body.documents.map(doc => ({
            type: doc.type, // e.g., 'ARRETE_STATUT', 'DECRET', etc.
            name: doc.name,
            filePath: doc.filePath, // In this version, we store base64 or a mock path
          }))
        };
      }

      const created = await prisma.beneficiary.create({ data, include: { province: true, grade: true } });
      res.status(201).json(decryptBeneficiary(created));
    } catch (err) {
      console.error('Beneficiary create error:', err);
      const message = err.code === 'P2002' ? 'Ce numéro matricule ou de pièce d\'identité est déjà utilisé.' : (err.code === 'P2003' ? 'Province ou créateur invalide.' : (err.meta?.cause || err.message || 'Erreur lors de l\'enregistrement.'));
      return res.status(500).json({ error: message });
    }
  }
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN_CENTRAL', 'AGENT_PROVINCIAL', 'AGENT_RECENSEMENT'),
  auditLog({ action: 'UPDATE', entity: 'Beneficiary', captureBody: false }),
  [
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('birthDate').optional().isISO8601(),
    body('gender').optional().isIn(['M', 'F']),
    body('status').optional().isIn(['ACTIF', 'SUSPENDU', 'RADIE', 'EN_ATTENTE']),
    body('address').optional().trim(),
    body('phone').optional().trim(),
    body('email').optional({ values: 'falsy' }).isEmail(),
    body('poursuitEtudes').optional({ values: 'falsy' }).isBoolean(),
    body('attestationEtudesAt').optional({ values: 'falsy' }).isISO8601(),
    body('attestationExpiresAt').optional({ values: 'falsy' }).isISO8601(),
    body('photoData').optional({ values: 'falsy' }).isString(),
    body('fingerprintData').optional({ values: 'falsy' }).isString(),
    body('matricule').optional({ values: 'falsy' }).trim(),
    body('bank').optional({ values: 'falsy' }).trim(),
    body('institution').optional({ values: 'falsy' }).trim(),
    body('gradeId').optional({ values: 'falsy' }).isUUID(),
    body('isPaid').optional().isBoolean().toBoolean(),
    body('paymentAmount').optional({ values: 'falsy' }).isFloat().toFloat(),
    body('documentsToDelete').optional().isArray(),
  ],
  async (req, res) => {
    const existing = await prisma.beneficiary.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Bénéficiaire non trouvé' });
    if (!canAccessProvince(req.user, existing.provinceId)) return res.status(403).json({ error: 'Accès non autorisé' });
    const updates = {};
    if (req.body.firstName !== undefined) updates.firstNameEncrypted = encrypt(req.body.firstName);
    if (req.body.lastName !== undefined) updates.lastNameEncrypted = encrypt(req.body.lastName);
    if (req.body.birthDate !== undefined) updates.birthDate = new Date(req.body.birthDate);
    if (req.body.gender !== undefined) updates.gender = req.body.gender;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.address !== undefined) updates.addressEncrypted = req.body.address && String(req.body.address).trim() ? encrypt(req.body.address) : null;
    if (req.body.phone !== undefined) updates.phoneEncrypted = req.body.phone && String(req.body.phone).trim() ? encrypt(req.body.phone) : null;
    if (req.body.email !== undefined) updates.emailEncrypted = req.body.email && String(req.body.email).trim() ? encrypt(req.body.email) : null;
    if (req.body.bank !== undefined) updates.bankEncrypted = req.body.bank && String(req.body.bank).trim() ? encrypt(req.body.bank) : null;
    if (req.body.institution !== undefined) updates.institutionEncrypted = req.body.institution && String(req.body.institution).trim() ? encrypt(req.body.institution) : null;
    if (req.body.gradeId !== undefined) updates.gradeId = req.body.gradeId && String(req.body.gradeId).trim() ? req.body.gradeId : null;
    if (req.body.poursuitEtudes !== undefined) updates.poursuitEtudes = req.body.poursuitEtudes === true || req.body.poursuitEtudes === 'true' ? true : req.body.poursuitEtudes === false || req.body.poursuitEtudes === 'false' ? false : null;
    if (req.body.attestationEtudesAt !== undefined) updates.attestationEtudesAt = req.body.attestationEtudesAt && String(req.body.attestationEtudesAt).trim() ? new Date(req.body.attestationEtudesAt) : null;
    if (req.body.attestationExpiresAt !== undefined) updates.attestationExpiresAt = req.body.attestationExpiresAt && String(req.body.attestationExpiresAt).trim() ? new Date(req.body.attestationExpiresAt) : null;
    if (req.body.photoData !== undefined) updates.photoData = req.body.photoData && String(req.body.photoData).trim().startsWith('data:') ? req.body.photoData.trim() : null;
    if (req.body.fingerprintData !== undefined) updates.fingerprintData = req.body.fingerprintData && String(req.body.fingerprintData).trim() ? req.body.fingerprintData.trim() : null;
    if (req.body.matricule !== undefined) updates.matricule = req.body.matricule && String(req.body.matricule).trim() ? req.body.matricule.trim() : null;
    if (req.body.isPaid !== undefined) updates.isPaid = req.body.isPaid;
    if (req.body.paymentAmount !== undefined) updates.paymentAmount = req.body.isPaid ? req.body.paymentAmount : null;
    if (req.body.firstName !== undefined) updates.firstNameSearch = normalizeSearch(req.body.firstName);
    if (req.body.lastName !== undefined) updates.lastNameSearch = normalizeSearch(req.body.lastName);

    const docsToDelete = Array.isArray(req.body.documentsToDelete)
      ? req.body.documentsToDelete.map((t) => String(t || '').trim()).filter(Boolean)
      : [];
    const docsToCreate = Array.isArray(req.body.documents) ? req.body.documents : [];
    const createTypes = docsToCreate.map((d) => d?.type).filter(Boolean);
    const typesToClear = Array.from(new Set([...docsToDelete, ...createTypes]));

    const updated = await prisma.$transaction(async (tx) => {
      if (typesToClear.length > 0) {
        await tx.document.deleteMany({
          where: { beneficiaryId: req.params.id, type: { in: typesToClear } },
        });
      }

      const data = { ...updates };
      if (docsToCreate.length > 0) {
        data.documents = {
          create: docsToCreate.map((doc) => ({
            type: doc.type,
            name: doc.name,
            filePath: doc.filePath,
          })),
        };
      }

      return await tx.beneficiary.update({
        where: { id: req.params.id },
        data,
        include: { province: true, grade: true, documents: true },
      });
    });

    res.json(decryptBeneficiary(updated));
  }
);

router.delete('/:id', requireAuth, requireRole('ADMIN_CENTRAL'), async (req, res) => {
  const existing = await prisma.beneficiary.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Bénéficiaire non trouvé' });

  await prisma.beneficiary.delete({ where: { id: req.params.id } });
  res.json({ message: 'Bénéficiaire supprimé avec succès' });
});

export default router;
