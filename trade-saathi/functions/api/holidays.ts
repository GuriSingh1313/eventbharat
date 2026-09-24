import { bad, body, json, type Env } from '../_lib/env';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT date, name FROM holidays ORDER BY date').all();
  return json({ holidays: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const b = await body<{ date?: string; name?: string }>(request);
  if (!b.date || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return bad('Date sahi nahi hai');
  await env.DB.prepare('INSERT OR REPLACE INTO holidays (date, name) VALUES (?, ?)').bind(b.date, String(b.name ?? 'Holiday').slice(0, 60)).run();
  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const date = new URL(request.url).searchParams.get('date');
  await env.DB.prepare('DELETE FROM holidays WHERE date = ?').bind(date).run();
  return json({ ok: true });
};
