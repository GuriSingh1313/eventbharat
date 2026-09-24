// Indian number formatting + IST time helpers. Pure — used by app and Functions.
const inrFmt = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function inr(n: number, opts: { sign?: boolean; noDecimals?: boolean } = {}): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const body = opts.noDecimals ? intFmt.format(abs) : inrFmt.format(abs);
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  return `${sign}₹${body}`;
}

export function num(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

export function pct(n: number, opts: { sign?: boolean } = { sign: true }): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

export interface IstParts {
  date: string; // YYYY-MM-DD in IST
  hh: number;
  mm: number;
  minutes: number; // minutes since IST midnight
  dow: number; // 0 = Sunday
}

const IST_OFFSET_MIN = 330;

export function istParts(d: Date = new Date()): IstParts {
  const t = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  const hh = t.getUTCHours();
  const mm = t.getUTCMinutes();
  return {
    date: t.toISOString().slice(0, 10),
    hh,
    mm,
    minutes: hh * 60 + mm,
    dow: t.getUTCDay(),
  };
}

export function istTime(d: Date | number = new Date()): string {
  const p = istParts(typeof d === 'number' ? new Date(d) : d);
  const h12 = ((p.hh + 11) % 12) + 1;
  return `${h12}:${String(p.mm).padStart(2, '0')} ${p.hh < 12 ? 'AM' : 'PM'}`;
}

export function istDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
}
