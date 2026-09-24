import S from '../strings.hi-en.json';

type Dict = typeof S;
export const strings: Dict = S;

/** t('home.title') or t('home.needed', { pct: '3.2%' }) */
export function t(path: string, vars: Record<string, string | number> = {}): string {
  const v = path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], S);
  const str = typeof v === 'string' ? v : path;
  return str.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
