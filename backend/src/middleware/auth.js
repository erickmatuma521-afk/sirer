import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { province: true },
    });
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
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
