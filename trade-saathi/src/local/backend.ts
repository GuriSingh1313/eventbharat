// On-device backend: same routes as the Cloudflare Functions, data kept in this phone's storage.
// Used by the zero-setup Vercel build (VITE_BACKEND=local). Prices/search/Telegram go through tiny Vercel proxies.
import { cleanAlert } from '../../functions/_lib/alert';
import { cleanHolding } from '../../functions/_lib/holding';
import { dedupe, evaluateRules, type AlertKind } from '../lib/alerts';
import { istParts } from '../lib/format';
import { OPEN_MIN } from '../lib/market';
import { holdingCalc, portfolioCalc } from '../lib/money';
import { summaryText } from '../lib/summary';
import { SEED } from './seed';

interface HoldingRec { id: number; name: string; symbol: string; exchange: string; qty: number; avg_price: number; buy_date: string | null; broker: string; danger_level: number | null }
interface AlertRec { id: number; kind: AlertKind; symbol: string | null; value: number; label: string | null; active: number }
interface Db {
  v: 1;
  nextId: number;
  holdings: HoldingRec[];
  alerts: AlertRec[];
  journal: Array<Record<string, unknown> & { id: number }>;
  holidays: Array<{ date: string; name: string }>;
  settings: Record<string, string>;
  alertLog: Array<{ date: string; key: string; message: string; sent_at: number }>;
  auth: { pinHash?: string; fails: number; lockedUntil: number };
}

const KEY = 'ts:db';
const UNLOCK_KEY = 'ts:unlockedUntil';
const UNLOCK_MS = 12 * 3600_000;
const SUMMARY_MIN = 15 * 60 + 30;
const SUMMARY_UNTIL = 17 * 60;

export class HttpError extends Error { constructor(msg: string, public status: number) { super(msg); } }
const fail = (msg: string, status = 400): never => { throw new HttpError(msg, status); };

function seeded(): Db {
  let id = 1;
  return {
    v: 1, nextId: 0,
    holdings: SEED.holdings.map((h) => ({ id: id++, exchange: 'NSE', buy_date: null, broker: 'Groww', ...h })),
    alerts: SEED.alerts.map((a) => ({ id: id++, label: null, active: 1, ...a, kind: a.kind as AlertKind })),
    journal: SEED.journal.map((j) => ({ id: id++, ...j })),
    holidays: SEED.holidays.map(([date, name]) => ({ date, name })),
    settings: { ...SEED.settings },
    alertLog: [],
    auth: { fails: 0, lockedUntil: 0 },
  };
}

let cache: Db | null = null;
function load(): Db {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = JSON.parse(raw) as Db;
  } catch { /* fall through */ }
  if (!cache) { cache = seeded(); cache.nextId = 100; save(); }
  return cache;
}
function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { fail('Phone ki storage bhar gayi — Settings se backup lekar purana data hatao.', 507); }
}
const newId = (db: Db) => ++db.nextId;

async function hashPin(pin: string, saltB64?: string): Promise<string> {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256);
  const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
  return `pbkdf2$100000$${b64(salt)}$${b64(bits)}`;
}
const validPin = (p: unknown): p is string => typeof p === 'string' && /^\d{4,6}$/.test(p);
function unlocked(): boolean { try { return Number(localStorage.getItem(UNLOCK_KEY)) > Date.now(); } catch { return false; } }
function unlock(on: boolean) { try { localStorage.setItem(UNLOCK_KEY, on ? String(Date.now() + UNLOCK_MS) : '0'); } catch { /* ignore */ } }

async function remote<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${import.meta.env.BASE_URL.replace(/\/trade-saathi\/$/, '/')}api/${path}`, init);
  const d = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) fail(d.error ?? `HTTP ${r.status}`, r.status);
  return d;
}
async function telegram<T>(method: string, params: Record<string, string>): Promise<T> {
  return remote<T>('ts-telegram', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, params }) });
}
const chatIds = (db: Db): string[] => { try { return (JSON.parse(db.settings.telegram_chat_ids ?? '[]') as unknown[]).map(String); } catch { return []; } };
async function broadcast(db: Db, text: string): Promise<number> {
  const token = db.settings.telegram_token;
  if (!token) return 0;
  const res = await Promise.all(chatIds(db).map((id) => telegram('sendMessage', { token, chat_id: id, text }).then(() => true, () => false)));
  return res.filter(Boolean).length;
}

const PUBLIC_SETTINGS = ['danger_default_pct', 'telegram_chat_ids', 'watchlist', 'lang_style'];

export async function localApi(method: string, path: string, body: unknown): Promise<unknown> {
  const url = new URL(path, 'http://x');
  const p = url.pathname;
  const b = (body ?? {}) as Record<string, unknown>;
  const db = load();

  if (p === '/api/quotes') return remote(`ts-quotes${url.search}`);
  if (p === '/api/search') return remote(`ts-search${url.search}`);
  if (p === '/api/health') return { ok: true, db: true };

  // --- auth (device lock) ---
  if (p === '/api/auth/status') return { pinSet: !!db.auth.pinHash, loggedIn: !!db.auth.pinHash && unlocked() };
  if (p === '/api/auth/setup') {
    if (db.auth.pinHash) fail('PIN pehle se set hai', 409);
    if (!validPin(b.pin)) fail('PIN 4 se 6 number ka hona chahiye');
    db.auth.pinHash = await hashPin(b.pin as string); save(); unlock(true); return { ok: true };
  }
  if (p === '/api/auth/login') {
    const now = Date.now();
    if (db.auth.lockedUntil > now) fail(`Bahut galat try ho gaye. ${Math.ceil((db.auth.lockedUntil - now) / 60_000)} minute baad try karo.`, 429);
    const stored = db.auth.pinHash ?? fail('Pehle PIN set karo', 409);
    const salt = stored.split('$')[2];
    if (typeof b.pin !== 'string' || (await hashPin(b.pin, salt)) !== stored) {
      db.auth.fails += 1;
      if (db.auth.fails >= 5) { db.auth.fails = 0; db.auth.lockedUntil = now + 15 * 60_000; save(); fail('Bahut galat try — 15 minute ke liye lock.', 401); }
      save(); fail(`Galat PIN. ${5 - db.auth.fails} try bache.`, 401);
    }
    db.auth.fails = 0; db.auth.lockedUntil = 0; save(); unlock(true); return { ok: true };
  }
  if (!db.auth.pinHash || !unlocked()) fail('login chahiye', 401);
  if (p === '/api/auth/logout') { unlock(false); return { ok: true }; }
  if (p === '/api/auth/change-pin') {
    const salt = db.auth.pinHash!.split('$')[2];
    if (typeof b.oldPin !== 'string' || (await hashPin(b.oldPin, salt)) !== db.auth.pinHash) fail('Purana PIN galat hai', 401);
    if (!validPin(b.newPin)) fail('Naya PIN 4 se 6 number ka hona chahiye');
    db.auth.pinHash = await hashPin(b.newPin as string); save(); return { ok: true };
  }

  // --- holdings ---
  if (p === '/api/holdings' && method === 'GET') return { holdings: [...db.holdings].sort((x, y) => x.name.localeCompare(y.name)) };
  if (p === '/api/holdings' && method === 'POST') {
    const h = cleanHolding(b); if (typeof h === 'string') fail(h as string);
    const rec = { id: newId(db), ...(h as Omit<HoldingRec, 'id'>) }; db.holdings.push(rec); save(); return { holding: rec };
  }
  if (p === '/api/holdings/import') {
    const rows = b.rows as unknown[];
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 200) fail('Koi row nahi mili');
    const clean = rows.map((r, i) => { const h = cleanHolding(r as object); if (typeof h === 'string') fail(`Row ${i + 1}: ${h}`); return h as Omit<HoldingRec, 'id'>; });
    if (b.mode === 'replace') db.holdings = [];
    clean.forEach((h) => db.holdings.push({ id: newId(db), ...h })); save(); return { ok: true, count: clean.length };
  }
  let m = p.match(/^\/api\/holdings\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    const i = db.holdings.findIndex((x) => x.id === id);
    if (i < 0) fail('Nahi mila', 404);
    if (method === 'DELETE') { db.holdings.splice(i, 1); save(); return { ok: true }; }
    const h = cleanHolding(b); if (typeof h === 'string') fail(h as string);
    db.holdings[i] = { id, ...(h as Omit<HoldingRec, 'id'>) }; save(); return { holding: db.holdings[i] };
  }

  // --- alerts ---
  if (p === '/api/alerts' && method === 'GET') return { alerts: db.alerts, log: [...db.alertLog].sort((x, y) => y.sent_at - x.sent_at).slice(0, 30) };
  if (p === '/api/alerts' && method === 'POST') {
    const a = cleanAlert(b); if (typeof a === 'string') fail(a as string);
    const rec = { id: newId(db), ...(a as Omit<AlertRec, 'id'>) }; db.alerts.push(rec); save(); return { alert: rec };
  }
  if (p === '/api/alerts/run') return runLocalAlerts(db, url.searchParams.get('force') === '1', url.searchParams.get('dry') === '1');
  m = p.match(/^\/api\/alerts\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    const i = db.alerts.findIndex((x) => x.id === id);
    if (i < 0) fail('Nahi mila', 404);
    if (method === 'DELETE') { db.alerts.splice(i, 1); save(); return { ok: true }; }
    const a = cleanAlert(b); if (typeof a === 'string') fail(a as string);
    db.alerts[i] = { id, ...(a as Omit<AlertRec, 'id'>) }; save(); return { alert: db.alerts[i] };
  }

  // --- settings / holidays / telegram / backup ---
  if (p === '/api/settings' && method === 'GET') {
    return { settings: Object.fromEntries(PUBLIC_SETTINGS.filter((k) => k in db.settings).map((k) => [k, db.settings[k]!])), telegramTokenSet: !!db.settings.telegram_token, cronSecretSet: false };
  }
  if (p === '/api/settings' && method === 'PUT') {
    for (const [k, v] of Object.entries(b)) {
      if (!PUBLIC_SETTINGS.includes(k)) fail(`Unknown setting ${k}`);
      db.settings[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    save(); return { ok: true };
  }
  if (p === '/api/holidays') {
    if (method === 'GET') return { holidays: [...db.holidays].sort((x, y) => x.date.localeCompare(y.date)) };
    if (method === 'DELETE') { db.holidays = db.holidays.filter((h) => h.date !== url.searchParams.get('date')); save(); return { ok: true }; }
    if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) fail('Date sahi nahi hai');
    db.holidays = db.holidays.filter((h) => h.date !== b.date).concat({ date: b.date as string, name: String(b.name || 'Holiday').slice(0, 60) });
    save(); return { ok: true };
  }
  if (p === '/api/telegram/detect') {
    if (typeof b.token === 'string' && b.token) {
      if (!/^\d{6,12}:[\w-]{30,}$/.test(b.token.trim())) fail('Token sahi format mein nahi hai. BotFather wala poora token copy karo.');
      db.settings.telegram_token = b.token.trim(); save();
    }
    const token = db.settings.telegram_token ?? fail('Pehle bot token daalo');
    const me = await telegram<{ result?: { username?: string } }>('getMe', { token }).catch(() => fail('Token kaam nahi kar raha. BotFather se dobara check karo.'));
    const up = await telegram<{ result?: Array<{ message?: { chat?: { id: number; first_name?: string; title?: string; username?: string } } }> }>('getUpdates', { token, limit: '100' });
    const chats = new Map<string, string>();
    for (const u of up.result ?? []) { const c = u.message?.chat; if (c) chats.set(String(c.id), c.first_name ?? c.title ?? c.username ?? String(c.id)); }
    return { bot: me.result?.username ?? '', chats: [...chats].map(([id, name]) => ({ id, name })) };
  }
  if (p === '/api/telegram/test') {
    if (chatIds(db).length === 0) fail('Pehle chat ID save karo');
    const n = await broadcast(db, '✅ Trade Saathi se test message! Alerts yahan aayenge. 🙏');
    return n > 0 ? { ok: true, sent: n } : fail('Message nahi gaya. Kya aapne bot ko "Start" dabaya?');
  }
  if (p === '/api/export') {
    return { app: 'trade-saathi', version: 1, exportedAt: new Date().toISOString(), holdings: db.holdings, alerts: db.alerts, journal: db.journal, holidays: db.holidays,
      settings: PUBLIC_SETTINGS.filter((k) => k in db.settings).map((k) => ({ key: k, value: db.settings[k] })) };
  }
  if (p === '/api/import') {
    if (b.app !== 'trade-saathi') fail('Ye Trade Saathi ki backup file nahi lagti');
    const reId = <T extends object>(rows: unknown): Array<T & { id: number }> => (Array.isArray(rows) ? rows : []).map((r) => ({ ...(r as T), id: newId(db) }));
    if (Array.isArray(b.holdings)) db.holdings = reId<HoldingRec>(b.holdings);
    if (Array.isArray(b.alerts)) db.alerts = reId<AlertRec>(b.alerts);
    if (Array.isArray(b.journal)) db.journal = reId<Record<string, unknown>>(b.journal);
    if (Array.isArray(b.holidays)) db.holidays = (b.holidays as Array<{ date: string; name: string }>).map((h) => ({ date: h.date, name: h.name }));
    if (Array.isArray(b.settings)) for (const s of b.settings as Array<{ key: string; value: string }>) if (PUBLIC_SETTINGS.includes(s.key)) db.settings[s.key] = String(s.value);
    save(); return { ok: true };
  }
  return fail('Not found', 404);
}

interface QuoteLite { ltp: number; prevClose: number; todayHasCandle?: boolean }

/** Same logic as the server engine: runs whenever the app refreshes prices. */
async function runLocalAlerts(db: Db, force: boolean, dry: boolean) {
  const now = new Date();
  const p = istParts(now);
  if (!force) {
    if (p.dow === 0 || p.dow === 6) return { skipped: 'weekend', sent: [], checked: 0 };
    const hol = db.holidays.find((h) => h.date === p.date);
    if (hol) return { skipped: `holiday: ${hol.name}`, sent: [], checked: 0 };
    if (p.minutes < OPEN_MIN || p.minutes > SUMMARY_UNTIL) return { skipped: 'market band', sent: [], checked: 0 };
  }
  const rules = db.alerts.filter((a) => a.active);
  const symbols = [...new Set([...db.holdings.map((h) => h.symbol), ...rules.map((r) => r.symbol).filter((s): s is string => !!s)])];
  const { quotes } = symbols.length ? await remote<{ quotes: Record<string, QuoteLite> }>(`ts-quotes?symbols=${symbols.join(',')}`) : { quotes: {} };
  const qs = Object.values(quotes);
  if (!force && qs.length > 0 && !qs.some((q) => q.todayHasCandle)) return { skipped: 'aaj koi candle nahi (holiday?)', sent: [], checked: 0 };

  const port = portfolioCalc(db.holdings.map((h) => holdingCalc({ qty: h.qty, avgPrice: h.avg_price }, quotes[h.symbol])));
  const allQuoted = db.holdings.length > 0 && db.holdings.every((h) => quotes[h.symbol]);
  const fired = evaluateRules(rules.map((r) => ({ ...r, active: true })), quotes, allQuoted ? port : null);
  if (p.minutes >= SUMMARY_MIN || force) fired.push({ key: 'daily_summary', ruleId: 0, message: summaryText(db.holdings, quotes, port, now) });
  if (dry) return { sent: fired.map((f) => f.message), checked: rules.length };

  const already = new Set(db.alertLog.filter((l) => l.date === p.date).map((l) => l.key));
  const fresh = dedupe(fired, already);
  for (const f of fresh) db.alertLog.push({ date: p.date, key: f.key, message: f.message, sent_at: Math.floor(Date.now() / 1000) });
  db.alertLog = db.alertLog.slice(-300);
  save();
  for (const f of fresh) await broadcast(db, f.message);
  return { sent: fresh.map((f) => f.message), checked: rules.length };
}
