import { describe, expect, it } from 'vitest';
import { dedupe, evaluateRules, type AlertRule } from '../../src/lib/alerts';

const rules: AlertRule[] = [
  { id: 1, kind: 'danger', symbol: 'LUPIN', value: 1960, active: true },
  { id: 2, kind: 'above', symbol: 'TCS', value: 3000, active: true },
  { id: 3, kind: 'day_move', symbol: 'HEG', value: 5, active: true },
  { id: 4, kind: 'buy_level', symbol: 'MCX', value: 3350, label: 'Part 1 of 3', active: true },
  { id: 5, kind: 'buy_level', symbol: 'MCX', value: 3250, label: 'Part 2 of 3', active: true },
  { id: 6, kind: 'portfolio_green', symbol: null, value: 0, active: true },
  { id: 7, kind: 'below', symbol: 'INFY', value: 2000, active: false },
];

describe('evaluateRules', () => {
  it('fires matching rules only', () => {
    const f = evaluateRules(
      rules,
      {
        LUPIN: { ltp: 1950, prevClose: 2000 },
        TCS: { ltp: 2900, prevClose: 2900 },
        HEG: { ltp: 280, prevClose: 265 },
        MCX: { ltp: 3300, prevClose: 3400 },
        INFY: { ltp: 1500, prevClose: 1500 },
      },
      { invested: 100, value: 99 },
    );
    expect(f.map((x) => x.ruleId)).toEqual([1, 3, 4]);
    expect(f[2]!.message).toContain('Part 1 of 3');
  });
  it('portfolio green', () => {
    expect(evaluateRules(rules, {}, { invested: 100, value: 100 }).map((x) => x.ruleId)).toEqual([6]);
  });
});

describe('dedupe', () => {
  it('drops already-sent and duplicate keys', () => {
    const fired = [
      { key: 'r1', ruleId: 1, message: 'a' },
      { key: 'r2', ruleId: 2, message: 'b' },
      { key: 'r2', ruleId: 2, message: 'b' },
    ];
    expect(dedupe(fired, new Set(['r1'])).map((x) => x.key)).toEqual(['r2']);
    expect(dedupe(fired, new Set(['r1', 'r2']))).toEqual([]);
  });
});
