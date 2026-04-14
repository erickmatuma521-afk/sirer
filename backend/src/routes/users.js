import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();

router.get('/', requireAuth, requireRole('ADMIN_CENTRAL'), async (req, res) => {
    const users = await prisma.user.findMany({
        where: {
            role: { not: 'SUPER_ADMIN' }
        },
        include: {
            province: true,
            _count: {
                select: { beneficiariesCreated: true }
            }
        },
        orderBy: { createdAt: 'desc' },
    });
    const result = users.map(u => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        province: u.province ? { id: u.province.id, name: u.province.name } : null,
        isActive: u.isActive,
        canAccessAllProvinces: u.canAccessAllProvinces,
        beneficiariesCount: u._count?.beneficiariesCreated ?? 0,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
    }));
    console.log('[DEBUG] Sending users to frontend:', result.map(u => ({ n: u.fullName, c: u.beneficiariesCount })));
    res.json(result);
});

router.post(
    '/',
    requireAuth,
    requireRole('ADMIN_CENTRAL'),
    [
        body('email').isEmail(),
        body('password').isLength({ min: 6 }),
        body('fullName').notEmpty().trim(),
        body('role').isIn(['ADMIN_CENTRAL', 'AGENT_PROVINCIAL', 'AGENT_RECENSEMENT']),
        body('provinceId').optional().isUUID(),
    ],
    auditLog({ action: 'CREATE', entity: 'User' }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: errors.array().map(e => e.msg).join('. ') });

        const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
        if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé' });

        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const user = await prisma.user.create({
            data: {
                email: req.body.email,
                passwordHash,
                fullName: req.body.fullName,
                role: req.body.role,
                provinceId: req.body.provinceId || null,
            },
        });

        res.status(201).json({ id: user.id, email: user.email });
    }
);

router.patch('/:id', requireAuth, requireRole('ADMIN_CENTRAL'), async (req, res) => {
    const updates = {};
    if (req.body.fullName !== undefined) updates.fullName = req.body.fullName;
    if (req.body.role !== undefined) updates.role = req.body.role;
    if (req.body.provinceId !== undefined) updates.provinceId = req.body.provinceId;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.canAccessAllProvinces !== undefined) updates.canAccessAllProvinces = req.body.canAccessAllProvinces;
    if (req.body.password) updates.passwordHash = await bcrypt.hash(req.body.password, 10);

    const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: updates,
    });
    res.json({ id: updated.id, email: updated.email });
});

router.delete('/:id', requireAuth, requireRole('ADMIN_CENTRAL'), async (req, res) => {
    try {
        if (req.userId === req.params.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });

        const target = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });

        // 1. Dissocier les logs d'audit (userId -> null)
        await prisma.auditLog.updateMany({
            where: { userId: req.params.id },
            data: { userId: null },
        });

        // 2. Transférer les bénéficiaires créés par cet utilisateur à l'admin courant
        await prisma.beneficiary.updateMany({
            where: { createdById: req.params.id },
            data: { createdById: req.userId },
        });

        // 3. Dissocier les alertes résolues par cet utilisateur
        await prisma.alert.updateMany({
            where: { resolvedById: req.params.id },
            data: { resolvedById: null },
        });

        // 4. Supprimer l'utilisateur
        await prisma.user.delete({ where: { id: req.params.id } });

        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (err) {
        console.error('User delete error:', err);
        res.status(500).json({ error: err.meta?.cause || err.message || 'Erreur lors de la suppression' });
    }
});

router.post('/reset-password-super/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: req.params.id },
            data: { passwordHash },
        });
        res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (err) {
        console.error('Super reset password error:', err);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
    }
});

export default router;
