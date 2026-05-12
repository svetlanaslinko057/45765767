/**
 * Dedup middleware — collapses identical in-flight idempotent requests
 * into a single network call.
 *
 * Key = method + url + sorted(params). POST/PATCH/PUT are NEVER deduped
 * (different semantics — even if body is identical, calling twice may be
 * intentional, e.g. two distinct pay-clicks).
 *
 * `noDedup: true` on RequestConfig opts out per-call.
 */
import type { Middleware, ApiResponse } from '../core/types';
import { isIdempotent } from '../core/request';

const inflight = new Map<string, Promise<ApiResponse>>();

function keyFor(method: string, url: string, params?: Record<string, unknown>): string {
  if (!params) return `${method} ${url}`;
  const keys = Object.keys(params).sort();
  const qs = keys.map((k) => `${k}=${String(params[k])}`).join('&');
  return `${method} ${url}?${qs}`;
}

export const dedupMiddleware: Middleware = async (ctx, next) => {
  const { method, url, params, noDedup } = ctx.config;
  if (noDedup || !isIdempotent(method)) return next();

  const key = keyFor(method, url, params);
  const existing = inflight.get(key);
  if (existing) {
    return existing;
  }
  const p = next().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
};
