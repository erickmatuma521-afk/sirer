/**
 * Point d'entrée serverless Vercel pour l'API Express SIRER.
 */
import app from '../backend/src/app.js';

export const config = {
  maxDuration: 60,
};

export default app;
