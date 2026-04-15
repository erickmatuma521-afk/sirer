import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { attachUser } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import provincesRoutes from './routes/provinces.js';
import beneficiariesRoutes from './routes/beneficiaries.js';
import alertsRoutes from './routes/alerts.js';
import dashboardRoutes from './routes/dashboard.js';
import cardsRoutes from './routes/cards.js';
import auditRoutes from './routes/audit.js';
import reportsRoutes from './routes/reports.js';
import orphansRoutes from './routes/orphans.js';
import jobsRoutes from './routes/jobs.js';
import usersRoutes from './routes/users.js';
import gradesRoutes from './routes/grades.js';

const app = express();

const corsOrigins = config.frontendUrls.length
  ? config.frontendUrls
  : ['http://localhost:5173'];

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (corsOrigins.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    // Prévisualisations / déploiements Vercel (*.vercel.app) en plus du domaine de prod
    if (hostname.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }
  return false;
}

app.use(
  cors({
    origin: (origin, cb) => {
      cb(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api/provinces', provincesRoutes);
app.use('/api/beneficiaries', beneficiariesRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/orphans', orphansRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/grades', gradesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'SIRER' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

export default app;
