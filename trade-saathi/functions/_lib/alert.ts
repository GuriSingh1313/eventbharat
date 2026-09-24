const KINDS = ['above', 'below', 'day_move', 'danger', 'buy_level', 'portfolio_green'] as const;
export interface AlertBody { kind?: string; symbol?: string | null; value?: number; label?: string | null; active?: boolean | number }

export function cleanAlert(b: AlertBody) {
  const kind = KINDS.find((k) => k === b.kind);
  if (!kind) return 'Alert ka type chuno';
  const symbol = kind === 'portfolio_green' ? null : String(b.symbol ?? '').toUpperCase().trim();
  if (symbol !== null && !/^[A-Z0-9&_-]{1,20}$/.test(symbol)) return 'Stock symbol daalo';
  const value = kind === 'portfolio_green' ? 0 : Number(b.value);
  if (kind !== 'portfolio_green' && !(value > 0)) return 'Value 0 se zyada honi chahiye';
  return { kind, symbol, value, label: b.label ? String(b.label).slice(0, 40) : null, active: b.active === false || b.active === 0 ? 0 : 1 };
}
