import { bad, body, json, type Env } from '../../_lib/env';
import { cleanHolding, type HoldingBody } from '../../_lib/holding';

/** Bulk import. mode 'replace' clears existing holdings first. */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const b = await body<{ rows?: HoldingBody[]; mode?: 'add' | 'replace' }>(request);
  if (!Array.isArray(b.rows) || b.rows.length === 0 || b.rows.length > 200) return bad('Koi row nahi mili');
  const clean = [];
  for (const [i, r] of b.rows.entries()) {
    const h = cleanHolding(r);
    if (typeof h === 'string') return bad(`Row ${i + 1}: ${h}`);
    clean.push(h);
  }
  const stmts = clean.map((h) =>
    env.DB.prepare('INSERT INTO holdings (name, symbol, exchange, qty, avg_price, buy_date, broker, danger_level) VALUES (?,?,?,?,?,?,?,?)')
      .bind(h.name, h.symbol, h.exchange, h.qty, h.avg_price, h.buy_date, h.broker, h.danger_level));
  if (b.mode === 'replace') stmts.unshift(env.DB.prepare('DELETE FROM holdings'));
  await env.DB.batch(stmts);
  return json({ ok: true, count: clean.length });
};
