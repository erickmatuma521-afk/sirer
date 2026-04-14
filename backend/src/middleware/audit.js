import { prisma } from '../lib/prisma.js';

export function auditLog(options = {}) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (req.userId && options.action) {
        prisma.auditLog.create({
          data: {
            userId: req.userId,
            beneficiaryId: options.beneficiaryId ?? body?.id ?? null,
            action: options.action,
            entity: options.entity || 'Unknown',
            entityId: options.entityId ?? body?.id ?? null,
            newValues: options.captureBody ? JSON.stringify(body) : null,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent'),
          },
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

export function auditFromBody(entity, actionKey = 'action') {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (req.userId && req.body[actionKey]) {
        prisma.auditLog.create({
          data: {
            userId: req.userId,
            beneficiaryId: req.body.beneficiaryId ?? body?.id ?? null,
            action: req.body[actionKey],
            entity,
            entityId: req.body.id ?? body?.id ?? null,
            newValues: JSON.stringify(req.body),
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent'),
          },
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}
