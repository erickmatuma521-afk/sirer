/**
 * Planificateur SIRER : alertes orphelins (18 ans, 25 ans) et autres tâches périodiques.
 * À lancer en cron (ex: tous les jours à 00:05) ou en process séparé.
 */
import 'dotenv/config';
import cron from 'node-cron';
import { runOrphanAlertsAndSuspensions } from '../services/orphanRules.js';

const TZ = process.env.TZ || 'Africa/Douala';

function runDailyOrphanRules() {
  const start = Date.now();
  runOrphanAlertsAndSuspensions()
    .then((r) => {
      console.log(`[SIRER Scheduler] Orphelins: ${r.orphelins18Created} alertes 18 ans créées, ${r.orphelins25Processed} traités à 25 ans (${Date.now() - start}ms)`);
    })
    .catch((e) => {
      console.error('[SIRER Scheduler] Erreur règles orphelins:', e);
    });
}

// Tous les jours à 00:05
cron.schedule('5 0 * * *', runDailyOrphanRules, { timezone: TZ });

console.log('[SIRER Scheduler] Démarré. Exécution quotidienne à 00:05 (timezone:', TZ, ')');
runDailyOrphanRules();
