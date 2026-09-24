import { bad, body, json, type Env } from '../../_lib/env';
import { cleanAlert, type AlertBody } from '../../_lib/alert';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM alerts ORDER BY symbol, kind, value DESC').all();
  const { results: log } = await env.DB.prepare('SELECT date, key, message, sent_at FROM alert_log ORDER BY sent_at DESC LIMIT 30').all();
  return json({ alerts: results, log });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const a = cleanAlert(await body<AlertBody>(request));
  if (typeof a === 'string') return bad(a);
  const r = await env.DB.prepare('INSERT INTO alerts (kind, symbol, value, label, active) VALUES (?,?,?,?,?) RETURNING *')
    .bind(a.kind, a.symbol, a.value, a.label, a.active).first();
  return json({ alert: r });
};
