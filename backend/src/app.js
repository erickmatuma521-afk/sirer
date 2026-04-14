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

app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
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
