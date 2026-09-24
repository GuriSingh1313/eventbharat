import { describe, expect, it } from 'vitest';
import { applyMapping, findHeaderRow, guessMapping, isComplete, parseCsv } from '../../src/lib/csv';

describe('csv import', () => {
  it('parses Groww export with title rows', () => {
    const text = 'Holdings statement\nName,Guri\n\nStock Name,ISIN,Quantity,Average buy price,Buying value,Closing price\n"Infosys Ltd",INE009A01021,25,"1,137.29",28432.25,1500\nTCS,INE467B01029,21,2396.50,50326.5,3000\n';
    const rows = parseCsv(text);
    const h = findHeaderRow(rows);
    const m = guessMapping(rows[h]!);
    expect(isComplete(m)).toBe(true);
    const out = applyMapping(rows.slice(h + 1), m);
    expect(out).toEqual([
      { name: 'Infosys Ltd', symbol: '', qty: 25, avg: 1137.29 },
      { name: 'TCS', symbol: '', qty: 21, avg: 2396.5 },
    ]);
  });
  it('parses Upstox export', () => {
    const rows = parseCsv('Instrument,Qty.,Avg. cost,LTP\nNMDCSTEEL-EQ,59,41.95,45\nHEG,93,267.16,300');
    const m = guessMapping(rows[0]!);
    expect(applyMapping(rows.slice(1), m)).toEqual([
      { name: 'NMDCSTEEL', symbol: 'NMDCSTEEL', qty: 59, avg: 41.95 },
      { name: 'HEG', symbol: 'HEG', qty: 93, avg: 267.16 },
    ]);
  });
  it('reports incomplete mapping for unknown headers', () => {
    expect(isComplete(guessMapping(['Foo', 'Bar']))).toBe(false);
  });
});
