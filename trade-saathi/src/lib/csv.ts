// CSV import for Groww / Upstox holdings exports, with fuzzy header mapping.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

export type Field = 'name' | 'symbol' | 'qty' | 'avg' | 'isin';
export type Mapping = Partial<Record<Field, number>>;

const ALIASES: Record<Field, string[]> = {
  symbol: ['symbol', 'trading symbol', 'tradingsymbol', 'instrument', 'scrip', 'nse symbol', 'ticker'],
  name: ['stock name', 'company name', 'name', 'company', 'security name', 'scrip name'],
  qty: ['quantity', 'qty', 'net qty', 'holding qty', 'shares', 'qty.', 'available qty'],
  avg: ['average buy price', 'avg. cost', 'avg cost', 'average price', 'avg price', 'avg. price', 'buy avg', 'buy average', 'average cost price'],
  isin: ['isin'],
};

const norm = (h: string) => h.toLowerCase().replace(/[()₹*]/g, '').replace(/\s+/g, ' ').trim();

/** Groww exports have a few title lines before the real header — find the header row. */
export function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const m = guessMapping(rows[i]!);
    if (m.qty !== undefined && m.avg !== undefined) return i;
  }
  return 0;
}

export function guessMapping(headers: string[]): Mapping {
  const m: Mapping = {};
  const hs = headers.map(norm);
  (Object.keys(ALIASES) as Field[]).forEach((f) => {
    for (const a of ALIASES[f]) {
      const idx = hs.findIndex((h) => h === a);
      if (idx >= 0 && !Object.values(m).includes(idx)) { m[f] = idx; return; }
    }
  });
  return m;
}

export function isComplete(m: Mapping): boolean {
  return m.qty !== undefined && m.avg !== undefined && (m.symbol !== undefined || m.name !== undefined);
}

export interface ImportRow {
  name: string;
  symbol: string;
  qty: number;
  avg: number;
}

const toNum = (s: string | undefined) => Number(String(s ?? '').replace(/[₹,\s]/g, ''));

export function applyMapping(rows: string[][], m: Mapping): ImportRow[] {
  const out: ImportRow[] = [];
  for (const r of rows) {
    const qty = toNum(m.qty !== undefined ? r[m.qty] : '');
    const avg = toNum(m.avg !== undefined ? r[m.avg] : '');
    if (!(qty > 0) || !(avg > 0)) continue;
    const rawSym = m.symbol !== undefined ? (r[m.symbol] ?? '') : '';
    const symbol = rawSym.toUpperCase().replace(/[-\s](EQ|BE)$/, '').replace(/\.(NS|BO)$/, '').trim();
    const name = (m.name !== undefined ? r[m.name] : '') || symbol;
    out.push({ name: name ?? symbol, symbol, qty, avg });
  }
  return out;
}
