import { json, type Env } from '../_lib/env';
import { getQuotes } from '../_lib/yahoo';

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const syms = (new URL(request.url).searchParams.get('symbols') ?? '').split(',').filter(Boolean);
  const quotes = await getQuotes(syms);
  return json({ quotes, fetchedAt: Date.now(), missing: syms.filter((s) => !quotes[s.toUpperCase()]) });
};
