/**
 * @evax/runtime-client — public API.
 *
 * Two factory entry points:
 *   - `createWebRuntimeClient(config)` — for the React/CRA web app
 *   - `createExpoRuntimeClient(config)` — for the Expo mobile app
 *
 * Both return the same `RuntimeClient` interface. UI code never imports
 * adapters/middleware directly — only the interface.
 */
import type {
  RuntimeClientConfig,
  RequestConfig,
  ApiResponse,
  PlatformAdapter,
  Middleware,
  CapabilityName,
  CapabilityState,
} from './core/types';
import { compose } from './core/request';
import { createWebAdapter } from './adapters/web';
import { createExpoAdapter, ExpoAdapterOptions } from './adapters/expo';
import { dedupMiddleware } from './middleware/dedup';
import { retryMiddleware } from './middleware/retry';
import { capabilityGateMiddleware } from './middleware/capability-gate';
import { makeTelemetryMiddleware } from './middleware/telemetry';
import { CapabilityClient } from './capabilities/client';
import { capabilityStore } from './capabilities/store';

export { ApiError, clientError } from './errors/ApiError';
export { ErrorCode } from './errors/codes';
export type {
  RuntimeClientConfig,
  RequestConfig,
  ApiResponse,
  PlatformAdapter,
  CapabilityName,
  CapabilityState,
  CapabilityMode,
  CapabilityPolicy,
  CapabilityManifest,
  TelemetryEvent,
  HttpMethod,
  Middleware,
} from './core/types';
export type { ApiErrorPayload } from './errors/ApiError';

export interface RuntimeClient {
  /** Single canonical request entry point. */
  request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>>;
  /** Convenience helpers (sugar over `request()`). */
  get<T = unknown>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<ApiResponse<T>>;
  post<T = unknown>(url: string, body?: unknown, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<ApiResponse<T>>;
  put<T = unknown>(url: string, body?: unknown, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<ApiResponse<T>>;
  patch<T = unknown>(url: string, body?: unknown, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<ApiResponse<T>>;
  delete<T = unknown>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<ApiResponse<T>>;
  /** Capability sub-client. */
  capabilities: CapabilityClient;
  /** Direct store access for hooks. */
  capabilityStore: typeof capabilityStore;
}

function buildClient(
  config: RuntimeClientConfig,
  adapter: PlatformAdapter,
): RuntimeClient {
  const middlewares: Middleware[] = [
    makeTelemetryMiddleware(config),
    dedupMiddleware,
    capabilityGateMiddleware,
    retryMiddleware,
  ];
  const exec = compose(middlewares, config, adapter);

  const capabilities = new CapabilityClient(config, adapter);
  void capabilities.boot();

  const request = <T = unknown>(req: RequestConfig) =>
    exec(req) as Promise<ApiResponse<T>>;

  return {
    request,
    get: (url, c) => request({ ...(c || {}), url, method: 'GET' }),
    post: (url, body, c) => request({ ...(c || {}), url, method: 'POST', body }),
    put: (url, body, c) => request({ ...(c || {}), url, method: 'PUT', body }),
    patch: (url, body, c) => request({ ...(c || {}), url, method: 'PATCH', body }),
    delete: (url, c) => request({ ...(c || {}), url, method: 'DELETE' }),
    capabilities,
    capabilityStore,
  };
}

export function createWebRuntimeClient(config: RuntimeClientConfig): RuntimeClient {
  return buildClient(config, createWebAdapter());
}

export function createExpoRuntimeClient(
  config: RuntimeClientConfig,
  adapterOptions?: ExpoAdapterOptions,
): RuntimeClient {
  return buildClient(config, createExpoAdapter(adapterOptions));
}
