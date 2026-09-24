import { createSession, sessionCookie, verifyPin } from '../../_lib/auth';
import { bad, body, getSetting, json, type Env } from '../../_lib/env';

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const db = env.DB;
  const now = Date.now();
  const att = (await db.prepare('SELECT fails, locked_until FROM login_attempts WHERE id = 1').first<{ fails: number; locked_until: number }>()) ?? { fails: 0, locked_until: 0 };
  if (att.locked_until > now) {
    return bad(`Bahut galat try ho gaye. ${Math.ceil((att.locked_until - now) / 60_000)} minute baad try karo.`, 429);
  }
  const { pin } = await body<{ pin?: string }>(request);
  const stored = await getSetting(db, 'pin_hash');
  if (!stored) return bad('Pehle PIN set karo', 409);
  if (typeof pin !== 'string' || !(await verifyPin(pin, stored))) {
    const fails = att.fails + 1;
    const locked = fails >= MAX_FAILS ? now + LOCK_MS : 0;
    await db.prepare('INSERT INTO login_attempts (id, fails, locked_until) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET fails = excluded.fails, locked_until = excluded.locked_until')
      .bind(locked ? 0 : fails, locked).run();
    return bad(locked ? 'Bahut galat try — 15 minute ke liye lock.' : `Galat PIN. ${MAX_FAILS - fails} try bache.`, 401);
  }
  await db.prepare('INSERT INTO login_attempts (id, fails, locked_until) VALUES (1, 0, 0) ON CONFLICT(id) DO UPDATE SET fails = 0, locked_until = 0').run();
  const sid = await createSession(db);
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(sid) } });
};
