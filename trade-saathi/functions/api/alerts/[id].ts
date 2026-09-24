import { bad, body, json, type Env } from '../../_lib/env';
import { cleanAlert, type AlertBody } from '../../_lib/alert';

export const onRequestPut: PagesFunction<Env> = async ({ env, request, params }) => {
  const a = cleanAlert(await body<AlertBody>(request));
  if (typeof a === 'string') return bad(a);
  const r = await env.DB.prepare('UPDATE alerts SET kind=?, symbol=?, value=?, label=?, active=? WHERE id=? RETURNING *')
    .bind(a.kind, a.symbol, a.value, a.label, a.active, Number(params.id)).first();
  return r ? json({ alert: r }) : bad('Nahi mila', 404);
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare('DELETE FROM alerts WHERE id = ?').bind(Number(params.id)).run();
  return json({ ok: true });
};
