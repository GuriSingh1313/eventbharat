// Daily summary text (Telegram + in-app). Pure.
import { inr, istTime, pct } from './format';
import { holdingCalc, type PortfolioCalc } from './money';

interface H { symbol: string; qty: number; avg_price: number }
interface Q { ltp: number; prevClose: number }

export function summaryText(holdings: H[], quotes: Record<string, Q | undefined>, port: PortfolioCalc, now: Date): string {
  const lines = holdings
    .map((h) => {
      const q = quotes[h.symbol];
      if (!q) return `• ${h.symbol}: data nahi mila`;
      const c = holdingCalc({ qty: h.qty, avgPrice: h.avg_price }, q);
      return `• ${h.symbol} ${inr(q.ltp)} (aaj ${pct(c.dayPct)}) · P&L ${inr(c.pnl, { sign: true })}`;
    })
    .join('\n');
  const green = holdings.some((h) => !quotes[h.symbol]) ? 'Kuch stocks ka price nahi mila — total adhoora hai.' : port.neededForGreenPct > 0 ? `Green hone ke liye ${port.neededForGreenPct.toFixed(1)}% aur chahiye.` : 'Portfolio green hai 🟢';
  return `📊 Aaj ka haal (${istTime(now)} IST)\n\nAaj: ${inr(port.dayChange, { sign: true })} (${pct(port.dayPct)})\nKul P&L: ${inr(port.pnl, { sign: true })} (${pct(port.pnlPct)})\nValue: ${inr(port.value)} / Lagaya: ${inr(port.invested)}\n${green}\n\n${lines}\n\nData thoda late ho sakta hai. Salah nahi, sirf jaankari.`;
}
