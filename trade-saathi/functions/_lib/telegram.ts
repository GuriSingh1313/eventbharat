import { getSetting, type Env } from './env';

export async function botToken(env: Env): Promise<string | null> {
  return env.TELEGRAM_BOT_TOKEN || (await getSetting(env.DB, 'telegram_token'));
}

export async function chatIds(env: Env): Promise<string[]> {
  const raw = await getSetting(env.DB, 'telegram_chat_ids');
  try {
    const v = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function sendTelegram(token: string, chatId: string, text: string): Promise<boolean> {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  return r.ok;
}

export async function broadcast(env: Env, text: string): Promise<number> {
  const token = await botToken(env);
  if (!token) return 0;
  const ids = await chatIds(env);
  const res = await Promise.all(ids.map((id) => sendTelegram(token, id, text).catch(() => false)));
  return res.filter(Boolean).length;
}
