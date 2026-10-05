import type { ProblemDetails } from './types';
import { getStoredLanguage, httpLanguageTag } from '@/lib/language';

const TOKEN_KEY = 'wt.accessToken';

// In dev we proxy /api -> http://localhost:5000 (no /api prefix on backend).
// In production set VITE_API_BASE_URL to the absolute API origin.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return `${API_BASE}/${path.replace(/^\/+/, '')}`;
}

export class ApiError extends Error {
  status: number;
  problem: ProblemDetails;
  constructor(status: number, problem: ProblemDetails) {
    const message =
      problem.title || problem.detail || `Request failed (${status})`;
    super(message);
    this.status = status;
    this.problem = problem;
    this.name = 'ApiError';
  }

  /** User-friendly list of validation messages, if any. */
  get messages(): string[] {
    if (this.problem.errors?.length) {
      return this.problem.errors.map((e) => e.description);
    }
    return [this.problem.detail || this.problem.title || this.message];
  }
}

/** Client-side validation error, shaped like a server problem response. */
export function makeApiError(message: string): ApiError {
  return new ApiError(400, { status: 400, title: message, detail: message });
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setTokens(access: string) {
  localStorage.setItem(TOKEN_KEY, access);
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  // Purge cached API responses (personal/financial data) from the PWA
  // service-worker cache so a logged-out device keeps nothing readable.
  if (typeof caches !== 'undefined') {
    void caches.delete('api-cache');
  }
}

// Set by the AuthContext to force a logout when the session expires.
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

async function parseProblem(res: Response): Promise<ProblemDetails> {
  const text = await res.text();
  if (!text) return { status: res.status, title: res.statusText };
  try {
    const json = JSON.parse(text);
    return json as ProblemDetails;
  } catch {
    return { status: res.status, title: text };
  }
}

let refreshing: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (refreshing) return refreshing;

  // The refresh token lives in an HttpOnly cookie (wt_refresh) set by
  // login/refresh — invisible to JS, so it must not be read from storage here.
  refreshing = (async () => {
    try {
      const res = await fetch(apiUrl('users/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': httpLanguageTag(getStoredLanguage()),
        },
      });
      if (!res.ok) return false;
      const data = await res.json();
      setTokens(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  // Some auth endpoints must not attempt a token refresh (e.g. refresh itself).
  auth?: boolean;
  // Skip Authorization header entirely (public endpoints).
  anonymous?: boolean;
}

async function doFetch(opts: RequestOptions, withAuth: boolean): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (withAuth) {
    const t = getAccessToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  // Tells the API which language to use for error messages.
  headers['Accept-Language'] = httpLanguageTag(getStoredLanguage());
  return fetch(apiUrl(opts.path), {
    method: opts.method,
    headers,
    // Same-origin in dev (Vite proxy); required cross-origin so the browser
    // sends/receives the wt_refresh cookie (backend has a CORS allowlist).
    credentials: 'include',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export async function request<T>(
  opts: RequestOptions,
): Promise<T> {
  const useAuth = opts.auth !== false;
  let res = await doFetch(opts, useAuth && !opts.anonymous);

  // Try a single silent refresh on 401 for authenticated calls.
  if (res.status === 401 && useAuth && !opts.anonymous) {
    const ok = await refreshToken();
    if (ok) {
      res = await doFetch(opts, true);
    } else {
      clearTokens();
      unauthorizedHandler?.();
    }
  }

  if (res.status === 204) {
    return null as T;
  }

  if (!res.ok) {
    const problem = await parseProblem(res);
    throw new ApiError(res.status, problem);
  }

  const text = await res.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const apiGet = <T>(path: string, anonymous = false) =>
  request<T>({ method: 'GET', path, anonymous });

export const apiPost = <T>(path: string, body?: unknown, anonymous = false) =>
  request<T>({ method: 'POST', path, body, anonymous });

export const apiPut = <T>(path: string, body?: unknown) =>
  request<T>({ method: 'PUT', path, body });

export const apiDelete = <T>(path: string) =>
  request<T>({ method: 'DELETE', path, });
