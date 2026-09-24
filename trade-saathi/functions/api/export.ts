import { json, type Env } from '../_lib/env';

const TABLES = ['holdings', 'alerts', 'journal', 'holidays'] as const;
const SAFE_SETTINGS = ['danger_default_pct', 'telegram_chat_ids', 'watchlist', 'lang_style'];

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const out: Record<string, unknown> = { app: 'trade-saathi', version: 1, exportedAt: new Date().toISOString() };
  for (const t of TABLES) out[t] = (await env.DB.prepare(`SELECT * FROM ${t}`).all()).results;
  out.settings = (await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN (${SAFE_SETTINGS.map(() => '?').join(',')})`).bind(...SAFE_SETTINGS).all()).results;
  return json(out, { headers: { 'content-disposition': `attachment; filename="trade-saathi-${new Date().toISOString().slice(0, 10)}.json"` } });
};
