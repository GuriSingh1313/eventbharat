import { bad, body, json, type Env } from '../../_lib/env';
import { cleanHolding, type HoldingBody } from '../../_lib/holding';

export const onRequestPut: PagesFunction<Env> = async ({ env, request, params }) => {
  const h = cleanHolding(await body<HoldingBody>(request));
  if (typeof h === 'string') return bad(h);
  const r = await env.DB.prepare('UPDATE holdings SET name=?, symbol=?, exchange=?, qty=?, avg_price=?, buy_date=?, broker=?, danger_level=? WHERE id=? RETURNING *')
    .bind(h.name, h.symbol, h.exchange, h.qty, h.avg_price, h.buy_date, h.broker, h.danger_level, Number(params.id)).first();
  if (!r) return bad('Nahi mila', 404);
  return json({ holding: r });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare('DELETE FROM holdings WHERE id = ?').bind(Number(params.id)).run();
  return json({ ok: true });
};
