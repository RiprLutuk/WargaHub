export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiClientOptions {
  baseUrl?: string;
  fallback?: Record<string, unknown | ((context: FallbackContext) => unknown | Promise<unknown>)>;
  timeoutMs?: number;
}

export interface FallbackContext {
  method: HttpMethod;
  path: string;
  body?: unknown;
  cause: unknown;
}

interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(message: string, status = 0, code = 'API_ERROR', details: unknown = null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ApiUnavailableError extends ApiClientError {
  constructor(cause: unknown) {
    super('Layanan WargaHub belum dapat dijangkau.', 0, 'API_UNAVAILABLE', cause);
    this.name = 'ApiUnavailableError';
  }
}

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('wargahub_csrf='))
    ?.split('=')[1];
  return token ? decodeURIComponent(token) : undefined;
}

function dispatchDemoMode(): void {
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('wargahub:demo-mode'));
  }
}

function normalizedPath(path: string): string {
  return path.split('?')[0] ?? path;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? 8_000;
  const fallbacks = options.fallback ?? {};

  async function fallbackFor<T>(context: FallbackContext): Promise<T> {
    if (context.method !== 'GET') throw new ApiUnavailableError(context.cause);
    const path = normalizedPath(context.path);
    const fallback = fallbacks[`${context.method} ${path}`] ?? fallbacks[path];
    if (fallback === undefined) throw new ApiUnavailableError(context.cause);
    dispatchDemoMode();
    const value = typeof fallback === 'function' ? await fallback(context) : fallback;
    return structuredClone(value) as T;
  }

  async function request<T>(method: HttpMethod, path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    if (body !== undefined && !(body instanceof FormData)) headers.set('content-type', 'application/json');
    const csrf = csrfToken();
    if (csrf && method !== 'GET') headers.set('x-csrf-token', csrf);

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;

    try {
      const requestInit: RequestInit = {
        ...init,
        method,
        credentials: 'include',
        headers,
        signal: controller.signal,
      };
      if (body !== undefined) {
        requestInit.body = body instanceof FormData ? body : JSON.stringify(body);
      }
      response = await fetch(`${baseUrl}${path}`, requestInit);
    } catch (cause) {
      const context: FallbackContext = body === undefined
        ? { method, path, cause }
        : { method, path, body, cause };
      return fallbackFor<T>(context);
    } finally {
      globalThis.clearTimeout(timeout);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? ((await response.json()) as ApiEnvelope<T> & ApiErrorEnvelope)
      : undefined;

    if (!response.ok) {
      throw new ApiClientError(
        payload?.error?.message ?? 'Permintaan tidak dapat diproses.',
        response.status,
        payload?.error?.code ?? `HTTP_${response.status}`,
        payload?.error?.details,
      );
    }

    if (payload && 'data' in payload) return payload.data;
    return payload as T;
  }

  return {
    get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
    post: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('POST', path, body, init),
    patch: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('PATCH', path, body, init),
    put: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('PUT', path, body, init),
    delete: <T>(path: string, init?: RequestInit) => request<T>('DELETE', path, undefined, init),
  };
}

import { demoFallbacks } from './demo';

const demoReadFallbackEnabled = import.meta.env.VITE_ENABLE_DEMO_FALLBACK === 'true';

export const api = demoReadFallbackEnabled
  ? createApiClient({ fallback: demoFallbacks })
  : createApiClient();
