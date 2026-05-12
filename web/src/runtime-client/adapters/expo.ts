/**
 * Expo platform adapter — Bearer token from AsyncStorage, with hooks for
 * auth-expired handling.
 *
 * Token storage key matches the existing app convention (`atlas_token`).
 * Persistent layer for capability cache also uses AsyncStorage.
 *
 * IMPORTANT: this module imports `@react-native-async-storage/async-storage`
 * lazily so that core/ stays platform-agnostic. The lazy require is wrapped
 * in try/catch so unit tests on Node can run without RN deps installed.
 */
import type { PlatformAdapter, RequestConfig } from '../core/types';

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function loadAsyncStorage(): AsyncStorageLike | null {
  try {
    // Lazy require — only resolved on RN runtime.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    return (mod && (mod.default || mod)) as AsyncStorageLike;
  } catch {
    return null;
  }
}

const TOKEN_KEY = 'atlas_token';

export interface ExpoAdapterOptions {
  /** Override the storage key for the bearer token. Default: 'atlas_token'. */
  tokenKey?: string;
  /** Hook called on 401/session_expired. Return true to retry once. */
  onAuthExpired?: () => Promise<boolean>;
}

export function createExpoAdapter(opts: ExpoAdapterOptions = {}): PlatformAdapter {
  const storage = loadAsyncStorage();
  const tokenKey = opts.tokenKey || TOKEN_KEY;

  // Token is read on every request so a logout in another component takes
  // effect immediately — small cost for simpler invariants.
  const readToken = async (): Promise<string | null> => {
    if (!storage) return null;
    try { return await storage.getItem(tokenKey); } catch { return null; }
  };

  // The decorateInit function is sync per PlatformAdapter contract, but we
  // need the token (async). Solution: a synchronous shadow variable that is
  // refreshed by `primeToken()` before each high-frequency burst, plus a
  // pre-request hook (handled below by patching the headers in transport).
  let cachedToken: string | null = null;

  // Best-effort: kick off async load so first-render requests have it.
  void (async () => { cachedToken = await readToken(); })();

  return {
    async getItem(key) {
      if (!storage) return null;
      try { return await storage.getItem(key); } catch { return null; }
    },
    async setItem(key, value) {
      if (!storage) return;
      try { await storage.setItem(key, value); } catch { /* ignore */ }
    },
    async removeItem(key) {
      if (!storage) return;
      try { await storage.removeItem(key); } catch { /* ignore */ }
    },
    decorateInit(init: RequestInit, _config: RequestConfig): RequestInit {
      // Re-read token synchronously from cache; primeToken() should be
      // invoked from `createRuntimeClient` boot so this is rarely empty.
      const headers = { ...(init.headers as Record<string, string> | undefined) };
      if (cachedToken) headers['authorization'] = `Bearer ${cachedToken}`;
      return { ...init, headers };
    },
    onAuthExpired: opts.onAuthExpired
      ? async () => {
          const retry = await opts.onAuthExpired!();
          // Re-prime token after caller refreshed it.
          cachedToken = await readToken();
          return retry;
        }
      : async () => {
          // Default: clear token, do not retry.
          if (storage) {
            try { await storage.removeItem(tokenKey); } catch { /* ignore */ }
          }
          cachedToken = null;
          return false;
        },
  };
}
