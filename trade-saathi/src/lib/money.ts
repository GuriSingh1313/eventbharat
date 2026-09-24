// All money maths. Pure functions, unit-tested.

export interface HoldingInput {
  qty: number;
  avgPrice: number;
  buyDate?: string | null; // YYYY-MM-DD
}

export interface QuoteInput {
  ltp: number;
  prevClose: number;
}

export interface HoldingCalc {
  invested: number;
  value: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
  dayPct: number;
}

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function holdingCalc(h: HoldingInput, q: QuoteInput | null | undefined): HoldingCalc {
  const invested = round2(h.qty * h.avgPrice);
  if (!q || !Number.isFinite(q.ltp)) {
    return { invested, value: invested, pnl: 0, pnlPct: 0, dayChange: 0, dayPct: 0 };
  }
  const value = round2(h.qty * q.ltp);
  const pnl = round2(value - invested);
  const dayChange = round2(h.qty * (q.ltp - q.prevClose));
  return {
    invested,
    value,
    pnl,
    pnlPct: invested > 0 ? (pnl / invested) * 100 : 0,
    dayChange,
    dayPct: q.prevClose > 0 ? ((q.ltp - q.prevClose) / q.prevClose) * 100 : 0,
  };
}

export interface PortfolioCalc {
  invested: number;
  value: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
  dayPct: number;
  /** % the portfolio must rise from current value to reach break-even. 0 if already green. */
  neededForGreenPct: number;
}

export function portfolioCalc(rows: HoldingCalc[]): PortfolioCalc {
  const invested = round2(rows.reduce((s, r) => s + r.invested, 0));
  const value = round2(rows.reduce((s, r) => s + r.value, 0));
  const dayChange = round2(rows.reduce((s, r) => s + r.dayChange, 0));
  const pnl = round2(value - invested);
  const prevValue = value - dayChange;
  return {
    invested,
    value,
    pnl,
    pnlPct: invested > 0 ? (pnl / invested) * 100 : 0,
    dayChange,
    dayPct: prevValue > 0 ? (dayChange / prevValue) * 100 : 0,
    neededForGreenPct: breakevenPct(invested, value),
  };
}

/** How many % must `current` rise to get back to `cost`. 0 if already at/above. */
export function breakevenPct(cost: number, current: number): number {
  if (current <= 0 || current >= cost) return 0;
  return ((cost - current) / current) * 100;
}

/** Long-term if held more than 12 months (sold after 1 year from buy date). */
export function holdingPeriod(buyDate: string | null | undefined, today: string): 'short' | 'long' | 'unknown' {
  if (!buyDate) return 'unknown';
  const [y, m, d] = buyDate.split('-').map(Number) as [number, number, number];
  const oneYearLater = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return today > oneYearLater ? 'long' : 'short';
}

export function daysHeld(buyDate: string, today: string): number {
  return Math.round((Date.parse(today) - Date.parse(buyDate)) / 86_400_000);
}

/** NSE equity tick size is ₹0.05 for most stocks. */
export function toTick(price: number, tick = 0.05, mode: 'down' | 'up' | 'near' = 'near'): number {
  const n = price / tick;
  const k = mode === 'down' ? Math.floor(n + 1e-9) : mode === 'up' ? Math.ceil(n - 1e-9) : Math.round(n);
  return round2(k * tick);
}

export function isOnTick(price: number, tick = 0.05): boolean {
  return Math.abs(toTick(price, tick) - price) < 1e-6;
}
