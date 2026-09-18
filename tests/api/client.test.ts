import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiGet,
  clearTokens,
  getAccessToken,
  request,
  setTokens,
  setUnauthorizedHandler,
} from '../../src/api/client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const store = new Map<string, string>();

function fetchCallsTo(urlPart: string): number {
  return (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
    ([url]) => String(url).includes(urlPart),
  ).length;
}

function lastFetchCall(urlPart: string): [string, RequestInit] {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
    ([url]) => String(url).includes(urlPart),
  );
  return calls[calls.length - 1] as [string, RequestInit];
}

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
  vi.stubGlobal('caches', { delete: vi.fn(async () => true) });
});

afterEach(() => {
  setUnauthorizedHandler(null);
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('sends the bearer token and includes credentials', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    setTokens('access-1');

    await apiGet('watches');

    const [, init] = lastFetchCall('watches');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
    expect(init.credentials).toBe('include');
  });

  it('refreshes via cookie and retries the original request once on 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { title: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'fresh' }))
      .mockResolvedValueOnce(jsonResponse(200, { data: 'payload' }));
    vi.stubGlobal('fetch', fetchMock);
    setTokens('stale');

    const result = await request<{ data: string }>({ method: 'GET', path: 'watches' });

    expect(result).toEqual({ data: 'payload' });
    expect(getAccessToken()).toBe('fresh');

    // The refresh call carries no body/token — the HttpOnly cookie does the work.
    const [, refreshInit] = lastFetchCall('users/refresh');
    expect(refreshInit.body).toBeUndefined();
    expect(refreshInit.credentials).toBe('include');

    // Retry uses the rotated access token.
    const calls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/watches'));
    const retryHeaders = calls[1][1].headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer fresh');
  });

  it('clears tokens and forces logout when the refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { title: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(401, { title: 'invalid refresh token' }));
    vi.stubGlobal('fetch', fetchMock);
    setTokens('stale');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(request({ method: 'GET', path: 'watches' })).rejects.toMatchObject({
      status: 401,
    });

    expect(getAccessToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('deduplicates concurrent refreshes (single-flight)', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('users/refresh')) {
        return jsonResponse(200, { accessToken: 'fresh' });
      }
      // Simulate the server: only the rotated token is accepted.
      const auth = (init?.headers as Record<string, string>)?.Authorization ?? '';
      return auth === 'Bearer fresh'
        ? jsonResponse(200, { url })
        : jsonResponse(401, { title: 'expired' });
    });
    vi.stubGlobal('fetch', fetchMock);
    setTokens('stale');

    const [a, b] = await Promise.all([apiGet('watches'), apiGet('trades')]);

    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(fetchCallsTo('users/refresh')).toBe(1);
  });

  it('clearTokens purges the PWA api cache', () => {
    setTokens('access-1');
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(vi.mocked(caches.delete)).toHaveBeenCalledWith('api-cache');
  });
});
