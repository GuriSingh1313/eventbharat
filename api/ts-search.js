// Trade Saathi symbol autocomplete (NSE/BSE equities) via Yahoo search.
export default async function handler(req, res) {
  const q = String(req.query.q ?? '').trim().slice(0, 40);
  if (q.length < 2) return res.status(200).json({ results: [] });
  try {
    const r = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    const d = await r.json();
    const seen = new Set();
    const results = (d.quotes ?? [])
      .filter((x) => x.symbol && /\.(NS|BO)$/.test(x.symbol) && x.quoteType === 'EQUITY')
      .map((x) => ({ symbol: x.symbol.replace(/\.(NS|BO)$/, ''), exchange: x.symbol.endsWith('.NS') ? 'NSE' : 'BSE', name: x.longname ?? x.shortname ?? '' }))
      .filter((x) => (seen.has(x.symbol) ? false : seen.add(x.symbol)));
    res.setHeader('cache-control', 'public, s-maxage=86400');
    res.status(200).json({ results });
  } catch {
    res.status(200).json({ results: [] });
  }
}
