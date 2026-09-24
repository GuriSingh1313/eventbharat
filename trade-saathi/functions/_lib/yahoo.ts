// Server-side Yahoo Finance chart fetch with 60s edge cache, retries and .NS → .BO fallback.
import { istParts } from '../../src/lib/format';

export interface QuoteOut {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  ltp: number;
  prevClose: number;
  time: number; // epoch ms of last candle
  spark: number[];
  todayHasCandle: boolean;
}

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function fetchChart(ticker: string): Promise<QuoteOut | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=5m&range=1d`;
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(url);
  let res = await cache.match(cacheKey);
  if (!res) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
        if (r.ok) {
          res = new Response(await r.text(), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' } });
          await cache.put(cacheKey, res.clone());
          break;
        }
        if (r.status === 404) return null;
      } catch {
        /* retry */
      }
      await new Promise((ok) => setTimeout(ok, 300 * (attempt + 1)));
    }
  }
  if (!res) return null;
  const data = (await res.json()) as YahooChart;
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
  const closes = (result.indicators?.quote?.[0]?.close ?? []).filter((x): x is number => typeof x === 'number');
  const stamps = result.timestamp ?? [];
  const lastTs = (stamps[stamps.length - 1] ?? meta.regularMarketTime ?? 0) * 1000;
  const sym = ticker.replace(/\.(NS|BO)$/, '');
  return {
    symbol: sym,
    exchange: ticker.endsWith('.BO') ? 'BSE' : 'NSE',
    ltp: meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice,
    time: lastTs,
    spark: downsample(closes, 40),
    todayHasCandle: lastTs > 0 && istParts(new Date(lastTs)).date === istParts().date,
  };
}

export async function getQuote(symbol: string): Promise<QuoteOut | null> {
  const s = symbol.toUpperCase().trim();
  if (!/^[A-Z0-9&^._-]{1,20}$/.test(s)) return null;
  if (s.startsWith('^')) return fetchChart(s); // indices like ^NSEI
  return (await fetchChart(`${s}.NS`)) ?? (await fetchChart(`${s}.BO`));
}

export async function getQuotes(symbols: string[]): Promise<Record<string, QuoteOut>> {
  const uniq = [...new Set(symbols.map((s) => s.toUpperCase()))].slice(0, 40);
  const out: Record<string, QuoteOut> = {};
  const results = await Promise.all(uniq.map((s) => getQuote(s).catch(() => null)));
  uniq.forEach((s, i) => {
    const q = results[i];
    if (q) out[s] = q;
  });
  return out;
}

function downsample(arr: number[], n: number): number[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]!).concat(arr[arr.length - 1]!);
}

interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; regularMarketTime?: number };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
}
