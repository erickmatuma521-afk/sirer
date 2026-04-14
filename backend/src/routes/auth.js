import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  auditLog({ action: 'LOGIN', entity: 'User' }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { province: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        province: user.province ? { id: user.province.id, code: user.province.code, name: user.province.name } : null,
      },
    });
  }
);

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { province: true },
  });
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    province: user.province ? { id: user.province.id, code: user.province.code, name: user.province.name } : null,
  });
});

export default router;
