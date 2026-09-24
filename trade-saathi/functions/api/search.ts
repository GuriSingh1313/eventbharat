import { json, type Env } from '../_lib/env';

/** Symbol autocomplete via Yahoo search (NSE/BSE equities only). */
export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 40);
  if (q.length < 2) return json({ results: [] });
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit);
    const d = (await r.json()) as { quotes?: Array<{ symbol?: string; shortname?: string; longname?: string; quoteType?: string }> };
    const results = (d.quotes ?? [])
      .filter((x) => x.symbol && /\.(NS|BO)$/.test(x.symbol) && x.quoteType === 'EQUITY')
      .map((x) => ({ symbol: x.symbol!.replace(/\.(NS|BO)$/, ''), exchange: x.symbol!.endsWith('.NS') ? 'NSE' : 'BSE', name: x.longname ?? x.shortname ?? '' }))
      .filter((x, i, a) => a.findIndex((y) => y.symbol === x.symbol) === i);
    return json({ results }, { headers: { 'cache-control': 'private, max-age=3600' } });
  } catch {
    return json({ results: [] });
  }
};
