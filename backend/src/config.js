import 'dotenv/config';

function parseFrontendUrls(raw) {
  const s = raw || 'http://localhost:5173';
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'secret-dev-change-in-production',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-32-bytes-key-for-aes-256!!',
  /** Une ou plusieurs origines CORS, séparées par des virgules (ex: prod Vercel + previews) */
  frontendUrls: parseFrontendUrls(process.env.FRONTEND_URL),
};
