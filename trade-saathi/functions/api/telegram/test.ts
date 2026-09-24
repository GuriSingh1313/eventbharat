import { bad, json, type Env } from '../../_lib/env';
import { broadcast, chatIds } from '../../_lib/telegram';

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  if ((await chatIds(env)).length === 0) return bad('Pehle chat ID save karo');
  const n = await broadcast(env, '✅ Trade Saathi se test message! Alerts yahan aayenge. 🙏');
  return n > 0 ? json({ ok: true, sent: n }) : bad('Message nahi gaya. Kya aapne bot ko "Start" dabaya?');
};
