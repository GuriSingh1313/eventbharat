import { hashPin, validPin, verifyPin } from '../../_lib/auth';
import { bad, body, getSetting, json, setSetting, type Env } from '../../_lib/env';

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const { oldPin, newPin } = await body<{ oldPin?: string; newPin?: string }>(request);
  const stored = await getSetting(env.DB, 'pin_hash');
  if (!stored || typeof oldPin !== 'string' || !(await verifyPin(oldPin, stored))) return bad('Purana PIN galat hai', 401);
  if (!validPin(newPin)) return bad('Naya PIN 4 se 6 number ka hona chahiye');
  await setSetting(env.DB, 'pin_hash', await hashPin(newPin));
  return json({ ok: true });
};
