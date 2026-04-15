/**
 * Erreurs Prisma / réseau souvent transitoires sur serverless (Vercel) + pooler Supabase.
 * @see https://www.prisma.io/docs/orm/reference/error-reference
 */
const TRANSIENT_PRISMA_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Connection timeout
  'P1017', // Server closed the connection
  'P2024', // Pool timeout
]);

export function isTransientDbError(err) {
  if (!err) return false;
  const code = err.code;
  if (TRANSIENT_PRISMA_CODES.has(code)) return true;
  const msg = String(err.message || '');
  return /ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|Connection terminated|closed the connection|timeout/i.test(
    msg
  );
}

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ tries?: number; baseDelayMs?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function withDbRetry(fn, { tries = 4, baseDelayMs = 80 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransientDbError(e) || i === tries - 1) throw e;
      const delay = baseDelayMs * 2 ** i;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw last;
}
