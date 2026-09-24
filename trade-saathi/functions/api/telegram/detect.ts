import { bad, body, json, setSetting, type Env } from '../../_lib/env';
import { botToken } from '../../_lib/telegram';

/** Saves the bot token (if given) and lists chats that pressed Start, via getUpdates. */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const b = await body<{ token?: string }>(request);
  if (b.token) {
    if (!/^\d{6,12}:[\w-]{30,}$/.test(b.token.trim())) return bad('Token sahi format mein nahi hai. BotFather wala poora token copy karo.');
    await setSetting(env.DB, 'telegram_token', b.token.trim());
  }
  const token = await botToken(env);
  if (!token) return bad('Pehle bot token daalo');
  const me = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  if (!me.ok) return bad('Token kaam nahi kar raha. BotFather se dobara check karo.');
  const botName = ((await me.json()) as { result?: { username?: string } }).result?.username ?? '';
  const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
  const d = (await r.json()) as { result?: Array<{ message?: { chat?: { id: number; first_name?: string; username?: string; title?: string } } }> };
  const chats = new Map<string, string>();
  for (const u of d.result ?? []) {
    const c = u.message?.chat;
    if (c) chats.set(String(c.id), c.first_name ?? c.title ?? c.username ?? String(c.id));
  }
  return json({ bot: botName, chats: [...chats].map(([id, name]) => ({ id, name })) });
};
