// First-run data for on-device mode (same as seed/seed.sql). Editable later in the app.
export const SEED = {
  holdings: [
    { name: 'NMDC Steel', symbol: 'NMDCSTEEL', qty: 59, avg_price: 41.95, danger_level: 40 },
    { name: 'Lupin', symbol: 'LUPIN', qty: 67, avg_price: 2283.34, danger_level: 1960 },
    { name: 'HEG', symbol: 'HEG', qty: 93, avg_price: 267.16, danger_level: 225 },
    { name: 'Infosys', symbol: 'INFY', qty: 25, avg_price: 1137.29, danger_level: 945 },
    { name: 'TCS', symbol: 'TCS', qty: 21, avg_price: 2396.5, danger_level: 1950 },
  ],
  alerts: [
    { kind: 'danger', symbol: 'NMDCSTEEL', value: 40 }, { kind: 'danger', symbol: 'LUPIN', value: 1960 },
    { kind: 'danger', symbol: 'HEG', value: 225 }, { kind: 'danger', symbol: 'INFY', value: 945 },
    { kind: 'danger', symbol: 'TCS', value: 1950 },
    { kind: 'buy_level', symbol: 'MCX', value: 3350, label: 'Part 1 of 3' },
    { kind: 'buy_level', symbol: 'MCX', value: 3250, label: 'Part 2 of 3' },
    { kind: 'buy_level', symbol: 'MCX', value: 3100, label: 'Part 3 of 3' },
    { kind: 'portfolio_green', symbol: null, value: 0 },
  ],
  journal: [
    { date: '2026-09-24', symbol: 'NSE', side: 'buy', qty: 8, price: 1785, segment: 'ipo', reason: 'IPO allotment', note: 'NSE IPO allot hua', emotion: 'plan', account: 'Account 1' },
    { date: '2026-09-24', symbol: 'NSE', side: 'buy', qty: 8, price: 1785, segment: 'ipo', reason: 'IPO allotment', note: 'NSE IPO allot hua', emotion: 'plan', account: 'Account 2' },
    { date: '2026-09-24', symbol: 'NSE', side: 'sell', qty: 8, price: 1845, segment: 'ipo', reason: 'Stop-loss hit', note: 'SL: trigger 1850, limit 1845', emotion: 'plan', account: 'Account 1' },
    { date: '2026-09-24', symbol: 'NSE', side: 'sell', qty: 8, price: 1845, segment: 'ipo', reason: 'Stop-loss hit', note: 'SL: trigger 1850, limit 1845', emotion: 'plan', account: 'Account 2' },
  ],
  // NSE 2026 holidays — verify against the NSE circular; editable in Settings.
  holidays: [
    ['2026-01-26', 'Republic Day'], ['2026-03-03', 'Holi'], ['2026-03-26', 'Ram Navami'], ['2026-03-31', 'Mahavir Jayanti'],
    ['2026-04-03', 'Good Friday'], ['2026-04-14', 'Ambedkar Jayanti'], ['2026-05-01', 'Maharashtra Day'], ['2026-05-28', 'Bakri Id'],
    ['2026-06-26', 'Muharram'], ['2026-09-14', 'Ganesh Chaturthi'], ['2026-10-02', 'Gandhi Jayanti'], ['2026-10-20', 'Dussehra'],
    ['2026-11-10', 'Diwali Balipratipada'], ['2026-11-24', 'Guru Nanak Jayanti'], ['2026-12-25', 'Christmas'],
  ] as Array<[string, string]>,
  settings: { danger_default_pct: '7', watchlist: '["MCX"]' } as Record<string, string>,
};
