// Alert rule evaluation + per-day dedupe. Pure.
import { inr, pct } from './format';

export type AlertKind = 'above' | 'below' | 'day_move' | 'danger' | 'buy_level' | 'portfolio_green';

export interface AlertRule {
  id: number;
  kind: AlertKind;
  symbol: string | null; // null for portfolio_green
  value: number; // price, or % for day_move
  label?: string | null; // e.g. "Part 1 of 3"
  active: boolean;
}

export interface Quote {
  ltp: number;
  prevClose: number;
}

export interface Fired {
  key: string; // dedupe key (unique per rule per day)
  ruleId: number;
  message: string;
}

export function evaluateRules(
  rules: AlertRule[],
  quotes: Record<string, Quote | undefined>,
  portfolio: { invested: number; value: number } | null,
): Fired[] {
  const out: Fired[] = [];
  for (const r of rules) {
    if (!r.active) continue;
    if (r.kind === 'portfolio_green') {
      if (portfolio && portfolio.invested > 0 && portfolio.value >= portfolio.invested) {
        out.push({ key: `r${r.id}`, ruleId: r.id, message: `🟢 Portfolio green ho gaya! Value ${inr(portfolio.value)} (lagaya tha ${inr(portfolio.invested)}).` });
      }
      continue;
    }
    const q = r.symbol ? quotes[r.symbol] : undefined;
    if (!q || !r.symbol) continue;
    const s = r.symbol;
    const dayPct = q.prevClose > 0 ? ((q.ltp - q.prevClose) / q.prevClose) * 100 : 0;
    const tag = r.label ? ` (${r.label})` : '';
    switch (r.kind) {
      case 'above':
        if (q.ltp >= r.value) out.push(fire(r, `📈 ${s} ${inr(r.value)} ke upar gaya — abhi ${inr(q.ltp)}.`));
        break;
      case 'below':
        if (q.ltp <= r.value) out.push(fire(r, `📉 ${s} ${inr(r.value)} ke neeche aaya — abhi ${inr(q.ltp)}.`));
        break;
      case 'danger':
        if (q.ltp <= r.value) out.push(fire(r, `⚠️ Khatre ka price! ${s} abhi ${inr(q.ltp)} — aapka danger level ${inr(r.value)} tha. Plan check karo, ghabrana nahi.`));
        break;
      case 'day_move':
        if (Math.abs(dayPct) >= r.value) out.push(fire(r, `⚡ ${s} aaj ${pct(dayPct)} hila — abhi ${inr(q.ltp)}.`));
        break;
      case 'buy_level':
        if (q.ltp <= r.value) out.push(fire(r, `🛒 ${s} aapke buy level ${inr(r.value)}${tag} par aa gaya — abhi ${inr(q.ltp)}. Plan ke hisaab se hi lena.`));
        break;
    }
  }
  return out;
}

function fire(r: AlertRule, message: string): Fired {
  return { key: `r${r.id}`, ruleId: r.id, message };
}

/** Keep only alerts not yet sent today. `sent` = keys already logged for `date`. */
export function dedupe(fired: Fired[], sent: Set<string>): Fired[] {
  const seen = new Set(sent);
  const out: Fired[] = [];
  for (const f of fired) {
    if (seen.has(f.key)) continue;
    seen.add(f.key);
    out.push(f);
  }
  return out;
}
