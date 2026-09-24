import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks';
import { get, LOCAL, post, type Holding, type Quote } from './api';
import { holdingCalc, portfolioCalc, type HoldingCalc, type PortfolioCalc } from './lib/money';

export interface Row { h: Holding; q: Quote | undefined; c: HoldingCalc }

interface State {
  holdings: Holding[];
  quotes: Record<string, Quote>;
  rows: Row[];
  port: PortfolioCalc;
  loading: boolean;
  offline: boolean;
  error: string | null;
  fetchedAt: number | null;
  missing: string[];
  refresh: () => Promise<void>;
}

let lastAlertRun = 0;

const Ctx = createContext<State | null>(null);

export function DataProvider({ children }: { children: ComponentChildren }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = await get<{ holdings: Holding[] }>('/api/holdings');
      setHoldings(h.data.holdings);
      const syms = [...new Set(h.data.holdings.map((x) => x.symbol))];
      let off = h.offline;
      if (syms.length) {
        const q = await get<{ quotes: Record<string, Quote>; fetchedAt: number; missing: string[] }>(`/api/quotes?symbols=${syms.join(',')}`, '/api/quotes:holdings');
        setQuotes(q.data.quotes);
        setFetchedAt(q.data.fetchedAt);
        setMissing(q.data.missing);
        off = off || q.offline;
      }
      setOffline(off);
      // On-device mode has no server cron: check alerts whenever fresh prices arrive (at most every 5 min).
      if (LOCAL && !off && Date.now() - lastAlertRun > 5 * 60_000) {
        lastAlertRun = Date.now();
        void post('/api/alerts/run').catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVis = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVis);
    const iv = setInterval(() => document.visibilityState === 'visible' && void refresh(), 60_000);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(iv); };
  }, [refresh]);

  const value = useMemo<State>(() => {
    const rows = holdings.map((h) => {
      const q = quotes[h.symbol];
      return { h, q, c: holdingCalc({ qty: h.qty, avgPrice: h.avg_price }, q) };
    });
    return { holdings, quotes, rows, port: portfolioCalc(rows.map((r) => r.c)), loading, offline, error, fetchedAt, missing, refresh };
  }, [holdings, quotes, loading, offline, error, fetchedAt, missing, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): State {
  const s = useContext(Ctx);
  if (!s) throw new Error('DataProvider missing');
  return s;
}
