// Trade Saathi price proxy (Vercel serverless). Yahoo chart API → { quotes, fetchedAt, missing }.
// Same response shape as trade-saathi/functions/api/quotes.ts. Cached 60s at Vercel's edge.
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const istDate = (ms) => new Date(ms + 330 * 60_000).toISOString().slice(0, 10);

async function chart(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=5m&range=1d`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
      if (r.status === 404) return null;
      if (r.ok) {
        const d = await r.json();
        const res = d?.chart?.result?.[0];
        const meta = res?.meta;
        if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
        const closes = (res.indicators?.quote?.[0]?.close ?? []).filter((x) => typeof x === 'number');
        const stamps = res.timestamp ?? [];
        const lastTs = (stamps[stamps.length - 1] ?? meta.regularMarketTime ?? 0) * 1000;
        const step = Math.max(1, Math.floor(closes.length / 40));
        const spark = closes.filter((_, i) => i % step === 0);
        if (closes.length) spark.push(closes[closes.length - 1]);
        return {
          symbol: ticker.replace(/\.(NS|BO)$/, ''),
          exchange: ticker.endsWith('.BO') ? 'BSE' : 'NSE',
          ltp: meta.regularMarketPrice,
          prevClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice,
          time: lastTs,
          spark,
          todayHasCandle: lastTs > 0 && istDate(lastTs) === istDate(Date.now()),
        };
      }
    } catch { /* retry */ }
    await new Promise((ok) => setTimeout(ok, 300 * (attempt + 1)));
  }
  return null;
}

export default async function handler(req, res) {
  const syms = String(req.query.symbols ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z0-9&^._-]{1,20}$/.test(s));
  const uniq = [...new Set(syms)].slice(0, 40);
  const results = await Promise.all(uniq.map(async (s) => {
    try {
      if (s.startsWith('^')) return await chart(s); // indices like ^NSEI
      return (await chart(`${s}.NS`)) ?? (await chart(`${s}.BO`)); // NSE first, BSE fallback
    } catch {
      return null;
    }
  }));
  const quotes = {};
  uniq.forEach((s, i) => { if (results[i]) quotes[s] = results[i]; });
  res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=30');
  res.status(200).json({ quotes, fetchedAt: Date.now(), missing: uniq.filter((s) => !quotes[s]) });
}
