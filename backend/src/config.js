import 'dotenv/config';

function parseFrontendUrls(raw) {
  const s = raw || 'http://localhost:5173';
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function trimEnv(value, fallback) {
  const v = (value ?? '').trim();
  return v || fallback;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  /** Espaces ou retours ligne dans Vercel peuvent invalider tous les jetons si non normalisés */
  jwtSecret: trimEnv(process.env.JWT_SECRET, 'secret-dev-change-in-production'),
  encryptionKey: trimEnv(process.env.ENCRYPTION_KEY, 'default-32-bytes-key-for-aes-256!!'),
  /** Une ou plusieurs origines CORS, séparées par des virgules (ex: prod Vercel + previews) */
  frontendUrls: parseFrontendUrls(process.env.FRONTEND_URL),
};
