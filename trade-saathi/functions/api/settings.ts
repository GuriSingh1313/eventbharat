import { bad, body, json, setSetting, type Env } from '../_lib/env';

// Only these keys are readable/writable from the app. Secrets (pin_hash, telegram_token) never leave the server.
const PUBLIC_KEYS = ['danger_default_pct', 'telegram_chat_ids', 'watchlist', 'lang_style'];

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN (${PUBLIC_KEYS.map(() => '?').join(',')})`).bind(...PUBLIC_KEYS).all<{ key: string; value: string }>();
  const tok = await env.DB.prepare("SELECT 1 AS x FROM settings WHERE key = 'telegram_token'").first();
  const out: Record<string, string> = Object.fromEntries(results.map((r) => [r.key, r.value]));
  return json({ settings: out, telegramTokenSet: !!tok || !!env.TELEGRAM_BOT_TOKEN, cronSecretSet: !!env.CRON_SECRET });
};

export const onRequestPut: PagesFunction<Env> = async ({ env, request }) => {
  const b = await body<Record<string, unknown>>(request);
  for (const [k, v] of Object.entries(b)) {
    if (!PUBLIC_KEYS.includes(k)) return bad(`Unknown setting ${k}`);
    await setSetting(env.DB, k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  return json({ ok: true });
};
