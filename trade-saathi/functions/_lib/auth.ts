import { getSetting, safeEqual } from './env';

const ITER = 100_000;
const SESSION_DAYS = 30;
export const COOKIE = 'ts_session';

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function hashPin(pin: string, saltB64?: string): Promise<string> {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256);
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(bits)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [, , salt] = stored.split('$');
  if (!salt) return false;
  return safeEqual(await hashPin(pin, salt), stored);
}

export const validPin = (pin: unknown): pin is string => typeof pin === 'string' && /^\d{4,6}$/.test(pin);

export async function createSession(db: D1Database): Promise<string> {
  const id = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
  const now = Date.now();
  await db.prepare('INSERT INTO sessions (id, created_at, expires_at) VALUES (?, ?, ?)').bind(id, now, now + SESSION_DAYS * 86_400_000).run();
  await db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
  return id;
}

export function sessionCookie(id: string, maxAgeSec = SESSION_DAYS * 86_400): string {
  return `${COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;
}

export function readCookie(req: Request, name = COOKIE): string | null {
  const c = req.headers.get('cookie') ?? '';
  const m = c.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?.[1] ?? null;
}

export async function hasValidSession(req: Request, db: D1Database): Promise<boolean> {
  const id = readCookie(req);
  if (!id) return false;
  const r = await db.prepare('SELECT expires_at FROM sessions WHERE id = ?').bind(id).first<{ expires_at: number }>();
  return !!r && r.expires_at > Date.now();
}

export async function pinIsSet(db: D1Database): Promise<boolean> {
  return !!(await getSetting(db, 'pin_hash'));
}
