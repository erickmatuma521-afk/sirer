import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch (e) {
    const name = e?.name || '';
    if (name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }
    if (name === 'JsonWebTokenError' || name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Token invalide. Veuillez vous reconnecter.' });
    }
    console.error('requireAuth JWT', e);
    return res.status(500).json({ error: 'Erreur de vérification de session' });
  }

  req.userId = decoded.userId;
  req.userRole = decoded.role;

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { province: true },
    });
  } catch (e) {
    console.error('requireAuth DB', e);
    return res.status(503).json({
      error: 'Impossible de joindre la base de données. Réessayez dans un instant.',
    });
  }

  if (!user) {
    return res.status(401).json({ error: 'Session invalide : utilisateur introuvable.' });
  }
  if (!user.isActive) {
    return res.status(401).json({ error: 'Compte désactivé.' });
  }

  req.user = user;
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.userId) return res.status(401).json({ error: 'Non authentifié' });
    // SUPER_ADMIN can access everything
    if (req.userRole === 'SUPER_ADMIN' || allowedRoles.includes(req.userRole)) {
      return next();
    }
    return res.status(403).json({ error: 'Droits insuffisants' });
  };
}

export async function attachUser(req, res, next) {
  if (!req.userId) return next();
  try {
    req.user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { province: true },
    });
  } catch {
    // ignore
  }
  next();
}
