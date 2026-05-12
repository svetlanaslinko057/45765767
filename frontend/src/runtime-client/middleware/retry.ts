/**
 * Retry middleware — exponential backoff for retryable errors.
 *
 * STRICT rules:
 *  - Only retry idempotent methods (GET/HEAD/OPTIONS) UNLESS the caller
 *    provided an explicit `idempotencyKey` for a non-idempotent method.
 *  - Only retry errors with `retryable: true` (server's truth).
 *  - Never retry `auth_expired` — adapter handles that.
 *  - Caps at `retries` budget from config (default 0 — opt-in per request).
 */
import type { Middleware } from '../core/types';
import { isIdempotent } from '../core/request';
import { ApiError } from '../errors/ApiError';

function backoff(attempt: number): number {
  // 200ms, 600ms, 1.4s — cap at 2s. Jitter ±20%.
  const base = Math.min(2000, 200 * Math.pow(3, attempt - 1));
  const jitter = base * (0.8 + Math.random() * 0.4);
  return Math.round(jitter);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const retryMiddleware: Middleware = async (ctx, next) => {
  const budget = ctx.config.retries || 0;
  if (budget <= 0) return next();

  const eligible =
    isIdempotent(ctx.config.method) || !!ctx.config.idempotencyKey;
  if (!eligible) return next();

  let lastError: unknown;
  for (let attempt = 0; attempt <= budget; attempt++) {
    ctx.attempt = attempt;
    try {
      return await next();
    } catch (err) {
      lastError = err;
      if (!(err instanceof ApiError) || !err.retryable) throw err;
      if (attempt === budget) throw err;
      await sleep(backoff(attempt + 1));
    }
  }
  throw lastError;
};
