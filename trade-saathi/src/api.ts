// Tiny fetch wrapper: session cookie, JSON, offline fallback to last good GET response.
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export interface Result<T> { data: T; offline: boolean; savedAt?: number }

const KEY = (p: string) => `ts:cache:${p}`;

function readCache<T>(path: string): { data: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(KEY(path));
    return raw ? (JSON.parse(raw) as { data: T; savedAt: number }) : null;
  } catch {
    return null;
  }
}

function writeCache(path: string, data: unknown): void {
  try {
    localStorage.setItem(KEY(path), JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    /* storage full / private mode — fine */
  }
}

export let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; }

async function raw<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const d = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) {
    if (r.status === 401 && !path.startsWith('/api/auth/')) onUnauthorized();
    throw new ApiError(d.error ?? `HTTP ${r.status}`, r.status);
  }
  return d;
}

/** GET with offline fallback. */
export async function get<T>(path: string, cacheKey = path): Promise<Result<T>> {
  try {
    const data = await raw<T>('GET', path);
    writeCache(cacheKey, data);
    return { data, offline: false };
  } catch (e) {
    if (e instanceof ApiError && e.status !== 0 && e.status < 500) throw e;
    const c = readCache<T>(cacheKey);
    if (c) return { data: c.data, offline: true, savedAt: c.savedAt };
    throw e;
  }
}

export const post = <T>(path: string, body: unknown = {}) => raw<T>('POST', path, body);
export const put = <T>(path: string, body: unknown) => raw<T>('PUT', path, body);
export const del = <T>(path: string) => raw<T>('DELETE', path);

// Shared types
export interface Holding {
  id: number; name: string; symbol: string; exchange: string; qty: number; avg_price: number;
  buy_date: string | null; broker: string; danger_level: number | null;
}
export interface Quote { symbol: string; exchange: string; ltp: number; prevClose: number; time: number; spark: number[] }
export interface AlertRow { id: number; kind: import('./lib/alerts').AlertKind; symbol: string | null; value: number; label: string | null; active: number }
