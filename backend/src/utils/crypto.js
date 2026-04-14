import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey() {
  const key = process.env.ENCRYPTION_KEY || 'default-32-bytes-key-for-aes-256!!';
  return crypto.scryptSync(key, 'sirer-salt', KEY_LENGTH);
}

/**
 * Chiffre une donnée sensible (nom, N° national, etc.)
 */
export function encrypt(text) {
  if (!text) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Déchiffre une donnée
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return '';
  try {
    const key = getKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  } catch {
    return encryptedText;
  }
}

/**
 * Hash pour vérification (ex: QR code)
 */
export function hashForVerification(data) {
  return crypto.createHmac('sha256', getKey()).update(data).digest('hex').slice(0, 16);
}
