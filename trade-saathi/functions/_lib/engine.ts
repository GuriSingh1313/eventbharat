// Alert engine: shared by /api/alerts/run (cron) — evaluates rules, dedupes per IST day, sends Telegram.
import { evaluateRules, type AlertRule, type Fired } from '../../src/lib/alerts';
import { istParts } from '../../src/lib/format';
import { summaryText } from '../../src/lib/summary';
import { CLOSE_MIN, OPEN_MIN } from '../../src/lib/market';
import { holdingCalc, portfolioCalc } from '../../src/lib/money';
import type { Env } from './env';
import { broadcast } from './telegram';
import { getQuotes, type QuoteOut } from './yahoo';

interface HoldingRow { symbol: string; name: string; qty: number; avg_price: number }
interface AlertRow { id: number; kind: AlertRule['kind']; symbol: string | null; value: number; label: string | null; active: number }

export interface RunResult { skipped?: string; sent: string[]; summary?: boolean; checked: number }

const SUMMARY_MIN = 15 * 60 + 30;
const SUMMARY_UNTIL = 17 * 60;

export async function runAlerts(env: Env, now = new Date(), opts: { force?: boolean; dry?: boolean } = {}): Promise<RunResult> {
  const db = env.DB;
  const p = istParts(now);
  if (!opts.force) {
    if (p.dow === 0 || p.dow === 6) return { skipped: 'weekend', sent: [], checked: 0 };
    const hol = await db.prepare('SELECT name FROM holidays WHERE date = ?').bind(p.date).first<{ name: string }>();
    if (hol) return { skipped: `holiday: ${hol.name}`, sent: [], checked: 0 };
    if (p.minutes < OPEN_MIN || p.minutes > SUMMARY_UNTIL) return { skipped: 'market band', sent: [], checked: 0 };
  }

  const holdings = (await db.prepare('SELECT symbol, name, qty, avg_price FROM holdings').all<HoldingRow>()).results;
  const rules = (await db.prepare('SELECT * FROM alerts WHERE active = 1').all<AlertRow>()).results;
  const symbols = [...new Set([...holdings.map((h) => h.symbol), ...rules.map((r) => r.symbol).filter((s): s is string => !!s)])];
  const quotes = await getQuotes(symbols);
  const qs = Object.values(quotes);
  if (!opts.force && qs.length > 0 && !qs.some((q) => q.todayHasCandle)) {
    return { skipped: 'aaj koi candle nahi (holiday?)', sent: [], checked: 0 };
  }

  const rows = holdings.map((h) => holdingCalc({ qty: h.qty, avgPrice: h.avg_price }, quotes[h.symbol]));
  const port = portfolioCalc(rows);
  const toSend: Fired[] = [];

  if (p.minutes <= CLOSE_MIN + 5 || opts.force) {
    // Only judge 'portfolio green' when every holding has a live price (missing price = cost fallback, not real).
    const allQuoted = holdings.length > 0 && holdings.every((h) => quotes[h.symbol]);
    const fired = evaluateRules(rules.map((r) => ({ ...r, active: !!r.active })), quotes, allQuoted ? port : null);
    toSend.push(...fired);
  }
  if (p.minutes >= SUMMARY_MIN || opts.force) {
    toSend.push({ key: 'daily_summary', ruleId: 0, message: summaryText(holdings, quotes, port, now) });
  }

  const sent: string[] = [];
  for (const f of toSend) {
    if (opts.dry) { sent.push(f.message); continue; }
    // Dedupe: the (date, key) primary key makes this insert a no-op if already sent today.
    const ins = await db.prepare('INSERT OR IGNORE INTO alert_log (date, key, message) VALUES (?, ?, ?)').bind(p.date, f.key, f.message).run();
    if (!ins.meta.changes) continue;
    await broadcast(env, f.message);
    sent.push(f.message);
  }
  return { sent, checked: rules.length, summary: toSend.some((f) => f.key === 'daily_summary') };
}
