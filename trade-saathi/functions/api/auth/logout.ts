import { readCookie, sessionCookie } from '../../_lib/auth';
import { json, type Env } from '../../_lib/env';

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const id = readCookie(request);
  if (id) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie('', 0) } });
};
