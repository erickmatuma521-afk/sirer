/**
 * Règles métiers orphelins SIRER :
 * - À 18 ans : alerte automatique. Si pas d'études → suspension après validation admin.
 *   Si poursuit études → attestation enregistrée, alerte programmée à 25 ans.
 * - À 25 ans : coupure automatique des avantages, historisation.
 */

import { prisma } from '../lib/prisma.js';

const ORPHELIN = 'ORPHELIN';
const AYANT_DROIT = 'RENTIER';

function ageAt(birthDate, at = new Date()) {
  const b = new Date(birthDate);
  let age = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) age--;
  return age;
}

export async function runOrphanAlertsAndSuspensions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1) Orphelins qui viennent d'avoir 18 ans → créer alerte ORPHELIN_18_ANS si pas déjà ouverte
  const birthDate18 = new Date(today);
  birthDate18.setFullYear(birthDate18.getFullYear() - 18);
  const birthDate18End = new Date(birthDate18);
  birthDate18End.setDate(birthDate18End.getDate() + 1);

  const orphelins18 = await prisma.beneficiary.findMany({
    where: {
      type: AYANT_DROIT,
      ayantDroitSubType: ORPHELIN,
      status: 'ACTIF',
      birthDate: {
        gte: new Date(birthDate18.getFullYear(), birthDate18.getMonth(), birthDate18.getDate()),
        lt: birthDate18End,
      },
    },
    include: { alerts: { where: { type: 'ORPHELIN_18_ANS', status: 'OUVERTE' } } },
  });

  for (const o of orphelins18) {
    if (o.alerts.length > 0) continue;
    await prisma.alert.create({
      data: {
        beneficiaryId: o.id,
        type: 'ORPHELIN_18_ANS',
        status: 'OUVERTE',
        title: 'Orphelin atteint 18 ans – vérification études',
        description: 'Vérifier si le bénéficiaire poursuit les études et enregistrer une attestation ou procéder à la suspension des avantages.',
        dueDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ age: 18 }),
      },
    });
  }

  // 2) Orphelins qui ont 25 ans → coupure automatique + alerte 25 ans
  const birthDate25 = new Date(today);
  birthDate25.setFullYear(birthDate25.getFullYear() - 25);

  const orphelins25 = await prisma.beneficiary.findMany({
    where: {
      type: AYANT_DROIT,
      ayantDroitSubType: ORPHELIN,
      status: 'ACTIF',
      birthDate: {
        lte: birthDate25,
      },
    },
  });

  for (const o of orphelins25) {
    const age = ageAt(o.birthDate, today);
    if (age < 25) continue;

    await prisma.$transaction([
      prisma.suspensionHistory.create({
        data: {
          beneficiaryId: o.id,
          reason: 'AGE_25_ORPHELIN',
          effectiveAt: today,
          decisionNote: 'Coupure automatique à 25 ans (règle métier SIRER).',
        },
      }),
      prisma.beneficiary.update({
        where: { id: o.id },
        data: { status: 'RADIE' },
      }),
    ]);

    const existingAlert = await prisma.alert.findFirst({
      where: { beneficiaryId: o.id, type: 'ORPHELIN_25_ANS' },
    });
    if (!existingAlert) {
      await prisma.alert.create({
        data: {
          beneficiaryId: o.id,
          type: 'ORPHELIN_25_ANS',
          status: 'RESOLUE',
          title: 'Orphelin 25 ans – avantages coupés',
          description: 'Coupure automatique des avantages à 25 ans. Historisation effectuée.',
          resolvedAt: today,
          metadata: JSON.stringify({ age: 25, automatic: true }),
        },
      });
    }
  }

  // 3) Suspendre orphelins 18+ sans études : fait manuellement par l'admin (validation), pas automatique.
  // L'agent résout l'alerte ORPHELIN_18_ANS soit en enregistrant attestation soit en déclenchant suspension.

  // 4) Orphelins dont l'attestation expire bientôt (30 jours)
  const nextMonth = new Date(today);
  nextMonth.setDate(today.getDate() + 30);

  const expiringAttestations = await prisma.beneficiary.findMany({
    where: {
      type: AYANT_DROIT,
      ayantDroitSubType: ORPHELIN,
      status: 'ACTIF',
      poursuitEtudes: true,
      attestationExpiresAt: {
        lte: nextMonth,
      },
    },
    include: { alerts: { where: { type: 'ATTESTATION_EXPIRATION', status: 'OUVERTE' } } },
  });

  for (const o of expiringAttestations) {
    if (o.alerts.length > 0) continue;
    await prisma.alert.create({
      data: {
        beneficiaryId: o.id,
        type: 'ATTESTATION_EXPIRATION',
        status: 'OUVERTE',
        title: 'Attestation d\'études expirant bientôt',
        description: `L'attestation d'études pour ${o.lastName} expire le ${new Date(o.attestationExpiresAt).toLocaleDateString('fr-FR')}. Veuillez demander une nouvelle attestation ou suspendre les avantages.`,
        dueDate: o.attestationExpiresAt,
      },
    });
  }

  return { 
    orphelins18Created: orphelins18.filter(o => o.alerts.length === 0).length, 
    orphelins25Processed: orphelins25.length,
    attestationsExpiring: expiringAttestations.filter(o => o.alerts.length === 0).length
  };
}

/**
 * Appelé quand l'admin enregistre une attestation d'études pour un orphelin 18+.
 * Programme l'alerte à 25 ans.
 */
export async function registerAttestationEtudes(beneficiaryId, expiresAt) {
  const b = await prisma.beneficiary.findUnique({
    where: { id: beneficiaryId },
    include: { alerts: true },
  });
  if (!b || b.type !== AYANT_DROIT || b.ayantDroitSubType !== ORPHELIN) {
    throw new Error('Bénéficiaire orphelin non trouvé');
  }
  await prisma.beneficiary.update({
    where: { id: beneficiaryId },
    data: {
      poursuitEtudes: true,
      attestationEtudesAt: new Date(),
      attestationExpiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  const dueDate = new Date(b.birthDate);
  dueDate.setFullYear(dueDate.getFullYear() + 25);
  await prisma.alert.create({
    data: {
      beneficiaryId,
      type: 'ORPHELIN_25_ANS',
      status: 'OUVERTE',
      title: 'Alerte à 25 ans (études en cours)',
      description: 'À 25 ans les avantages seront automatiquement coupés.',
      dueDate,
      metadata: JSON.stringify({ attestationEnregistree: true }),
    },
  });
}
