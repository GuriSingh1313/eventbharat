import { describe, expect, it } from 'vitest';
import { breakevenPct, holdingCalc, holdingPeriod, isOnTick, portfolioCalc, toTick } from '../../src/lib/money';
import { inr, istParts, pct } from '../../src/lib/format';
import { marketState } from '../../src/lib/market';

describe('holdingCalc', () => {
  it('computes P&L and day change', () => {
    const r = holdingCalc({ qty: 67, avgPrice: 2283.34 }, { ltp: 2000, prevClose: 1980 });
    expect(r.invested).toBe(152983.78);
    expect(r.value).toBe(134000);
    expect(r.pnl).toBe(-18983.78);
    expect(r.pnlPct).toBeCloseTo(-12.409, 2);
    expect(r.dayChange).toBe(1340);
    expect(r.dayPct).toBeCloseTo(1.0101, 3);
  });
  it('falls back to cost when no quote', () => {
    const r = holdingCalc({ qty: 10, avgPrice: 100 }, null);
    expect(r).toMatchObject({ invested: 1000, value: 1000, pnl: 0 });
  });
});

describe('portfolio + breakeven', () => {
  it('needs 25% to recover a 20% loss', () => {
    expect(breakevenPct(100, 80)).toBeCloseTo(25);
    expect(breakevenPct(100, 120)).toBe(0);
    expect(breakevenPct(100, 0)).toBe(0);
  });
  it('sums rows', () => {
    const p = portfolioCalc([
      holdingCalc({ qty: 10, avgPrice: 100 }, { ltp: 90, prevClose: 95 }),
      holdingCalc({ qty: 5, avgPrice: 200 }, { ltp: 180, prevClose: 180 }),
    ]);
    expect(p.invested).toBe(2000);
    expect(p.value).toBe(1800);
    expect(p.pnl).toBe(-200);
    expect(p.dayChange).toBe(-50);
    expect(p.dayPct).toBeCloseTo((-50 / 1850) * 100);
    expect(p.neededForGreenPct).toBeCloseTo(11.111, 2);
  });
});

describe('holdingPeriod', () => {
  it('is long only after 12 months', () => {
    expect(holdingPeriod('2025-09-24', '2026-09-24')).toBe('short');
    expect(holdingPeriod('2025-09-24', '2026-09-25')).toBe('long');
    expect(holdingPeriod(null, '2026-09-25')).toBe('unknown');
  });
});

describe('tick size', () => {
  it('rounds to 0.05', () => {
    expect(toTick(1850.03)).toBe(1850.05);
    expect(toTick(1850.03, 0.05, 'down')).toBe(1850);
    expect(toTick(1850.01, 0.05, 'up')).toBe(1850.05);
    expect(isOnTick(1845)).toBe(true);
    expect(isOnTick(1845.1)).toBe(true);
    expect(isOnTick(1845.12)).toBe(false);
  });
});

describe('format', () => {
  it('uses Indian grouping', () => {
    expect(inr(123456.78)).toBe('₹1,23,456.78');
    expect(inr(-1000)).toBe('−₹1,000.00');
    expect(inr(5, { sign: true })).toBe('+₹5.00');
    expect(pct(-2.5)).toBe('−2.50%');
  });
  it('converts to IST', () => {
    const p = istParts(new Date('2026-09-24T03:45:00Z'));
    expect(p).toMatchObject({ date: '2026-09-24', hh: 9, mm: 15, dow: 4 });
    expect(istParts(new Date('2026-09-24T20:00:00Z')).date).toBe('2026-09-25');
  });
  it('market state', () => {
    expect(marketState(new Date('2026-09-24T03:45:00Z'))).toBe('open');
    expect(marketState(new Date('2026-09-24T03:40:00Z'))).toBe('pre-open');
    expect(marketState(new Date('2026-09-24T10:00:00Z'))).toBe('closed');
    expect(marketState(new Date('2026-09-26T05:00:00Z'))).toBe('weekend');
    expect(marketState(new Date('2026-09-24T05:00:00Z'), ['2026-09-24'])).toBe('holiday');
  });
});
