export interface HoldingBody {
  name?: string;
  symbol?: string;
  exchange?: string;
  qty?: number;
  avg_price?: number;
  buy_date?: string | null;
  broker?: string;
  danger_level?: number | null;
}

export interface CleanHolding {
  name: string;
  symbol: string;
  exchange: string;
  qty: number;
  avg_price: number;
  buy_date: string | null;
  broker: string;
  danger_level: number | null;
}

export function cleanHolding(b: HoldingBody): CleanHolding | string {
  const symbol = String(b.symbol ?? '').toUpperCase().trim();
  if (!/^[A-Z0-9&_-]{1,20}$/.test(symbol)) return 'Symbol sahi nahi hai (jaise INFY, TCS)';
  const qty = Number(b.qty);
  const avg = Number(b.avg_price);
  if (!(qty > 0)) return 'Quantity 0 se zyada honi chahiye';
  if (!(avg > 0)) return 'Avg price 0 se zyada hona chahiye';
  const buy = b.buy_date && /^\d{4}-\d{2}-\d{2}$/.test(b.buy_date) ? b.buy_date : null;
  const danger = b.danger_level != null && Number(b.danger_level) > 0 ? Number(b.danger_level) : null;
  return {
    name: String(b.name ?? symbol).slice(0, 80) || symbol,
    symbol,
    exchange: b.exchange === 'BSE' ? 'BSE' : 'NSE',
    qty,
    avg_price: avg,
    buy_date: buy,
    broker: ['Groww', 'Upstox', 'Other'].includes(String(b.broker)) ? String(b.broker) : 'Other',
    danger_level: danger,
  };
}
