import { createSession, hashPin, pinIsSet, sessionCookie, validPin } from '../../_lib/auth';
import { bad, body, json, setSetting, type Env } from '../../_lib/env';

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (await pinIsSet(env.DB)) return bad('PIN pehle se set hai', 409);
  const { pin } = await body<{ pin?: string }>(request);
  if (!validPin(pin)) return bad('PIN 4 se 6 number ka hona chahiye');
  await setSetting(env.DB, 'pin_hash', await hashPin(pin));
  const sid = await createSession(env.DB);
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(sid) } });
};
