import { bad, body, json, type Env } from '../../_lib/env';
import { cleanHolding, type HoldingBody } from '../../_lib/holding';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM holdings ORDER BY name').all();
  return json({ holdings: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const h = cleanHolding(await body<HoldingBody>(request));
  if (typeof h === 'string') return bad(h);
  const r = await env.DB.prepare('INSERT INTO holdings (name, symbol, exchange, qty, avg_price, buy_date, broker, danger_level) VALUES (?,?,?,?,?,?,?,?) RETURNING *')
    .bind(h.name, h.symbol, h.exchange, h.qty, h.avg_price, h.buy_date, h.broker, h.danger_level).first();
  return json({ holding: r });
};
