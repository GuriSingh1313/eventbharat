import { bad, body, json, type Env } from '../_lib/env';

const COLS: Record<string, string[]> = {
  holdings: ['name', 'symbol', 'exchange', 'qty', 'avg_price', 'buy_date', 'broker', 'danger_level'],
  alerts: ['kind', 'symbol', 'value', 'label', 'active'],
  journal: ['date', 'symbol', 'side', 'qty', 'price', 'segment', 'reason', 'note', 'emotion', 'account'],
  holidays: ['date', 'name'],
};
const SAFE_SETTINGS = ['danger_default_pct', 'telegram_chat_ids', 'watchlist', 'lang_style'];

/** Replace-all restore from an /api/export JSON file. */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const b = await body<Record<string, unknown>>(request);
  if (b.app !== 'trade-saathi') return bad('Ye Trade Saathi ki backup file nahi lagti');
  const stmts: D1PreparedStatement[] = [];
  for (const [table, cols] of Object.entries(COLS)) {
    const rows = b[table];
    if (!Array.isArray(rows)) continue;
    stmts.push(env.DB.prepare(`DELETE FROM ${table}`));
    for (const r of rows as Record<string, unknown>[]) {
      stmts.push(env.DB.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...cols.map((c) => (r[c] ?? null) as string | number | null)));
    }
  }
  if (Array.isArray(b.settings)) {
    for (const s of b.settings as Array<{ key: string; value: string }>) {
      if (SAFE_SETTINGS.includes(s.key)) stmts.push(env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(s.key, String(s.value)));
    }
  }
  await env.DB.batch(stmts);
  return json({ ok: true });
};
