import { istParts } from './format';

export type MarketState = 'open' | 'pre-open' | 'closed' | 'holiday' | 'weekend';

export const OPEN_MIN = 9 * 60 + 15;
export const CLOSE_MIN = 15 * 60 + 30;
export const PRE_OPEN_MIN = 9 * 60;

export function marketState(now: Date, holidays: string[] = []): MarketState {
  const p = istParts(now);
  if (p.dow === 0 || p.dow === 6) return 'weekend';
  if (holidays.includes(p.date)) return 'holiday';
  if (p.minutes >= OPEN_MIN && p.minutes < CLOSE_MIN) return 'open';
  if (p.minutes >= PRE_OPEN_MIN && p.minutes < OPEN_MIN) return 'pre-open';
  return 'closed';
}
