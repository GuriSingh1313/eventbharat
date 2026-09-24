import { describe, expect, it } from 'vitest';
import { buildOrderCard, slLimitFor, suggest } from '../../src/lib/orderCard';

const base = { ltp: 1900, qty: 8, heldQty: 8, avgPrice: 1785 };

describe('order card — stop-loss', () => {
  it('accepts the IPO SL (trigger 1850 / limit 1845)', () => {
    const c = buildOrderCard({ ...base, intent: 'stoploss', trigger: 1850, limit: 1845 });
    expect(c.errors).toEqual([]);
    expect(c.pnlAtTrigger).toBe(480); // (1845 - 1785) * 8
    expect(c.fields.find((f) => f.key === 'trigger')?.copy).toBe('1850.00');
    expect(c.fields.find((f) => f.key === 'type')?.value).toMatch(/SL/);
    expect(c.explanation).toContain('₹1,850.00');
  });
  it('rejects trigger at/above current price', () => {
    const c = buildOrderCard({ ...base, intent: 'stoploss', trigger: 1900, limit: 1895 });
    expect(c.errors.join()).toMatch(/neeche/);
  });
  it('rejects limit above trigger for sell SL', () => {
    const c = buildOrderCard({ ...base, intent: 'stoploss', trigger: 1850, limit: 1855 });
    expect(c.errors.join()).toMatch(/limit price trigger se zyada/);
  });
  it('rejects off-tick prices and too-large qty', () => {
    const c = buildOrderCard({ ...base, qty: 9, intent: 'stoploss', trigger: 1850.02, limit: 1845 });
    expect(c.errors.length).toBe(2);
  });
  it('warns when limit equals trigger', () => {
    const c = buildOrderCard({ ...base, intent: 'stoploss', trigger: 1850, limit: 1850 });
    expect(c.errors).toEqual([]);
    expect(c.warnings.length).toBe(1);
  });
  it('suggests from danger level with limit a bit lower', () => {
    expect(suggest('stoploss', 2000, 1960)).toEqual({ trigger: 1960, limit: 1954.1 });
    expect(slLimitFor(40)).toBe(39.85);
  });
});

describe('order card — limit orders', () => {
  it('target must be above ltp', () => {
    expect(buildOrderCard({ ...base, intent: 'target', price: 1890 }).errors.length).toBe(1);
    const ok = buildOrderCard({ ...base, intent: 'target', price: 2000, target: 2000 });
    expect(ok.errors).toEqual([]);
    expect(ok.pnlAtTarget).toBe(1720);
  });
  it('buy above ltp warns', () => {
    const c = buildOrderCard({ ...base, heldQty: 0, avgPrice: 0, intent: 'buy', price: 1950, target: 2050 });
    expect(c.errors).toEqual([]);
    expect(c.warnings.length).toBe(1);
    expect(c.pnlAtTarget).toBe(800);
  });
  it('rejects zero / fractional qty', () => {
    expect(buildOrderCard({ ...base, qty: 0, intent: 'sell', price: 1900 }).errors.length).toBe(1);
    expect(buildOrderCard({ ...base, qty: 1.5, intent: 'sell', price: 1900 }).errors.length).toBe(1);
  });
});
