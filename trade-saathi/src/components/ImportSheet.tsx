import { useState } from 'preact/hooks';
import { get, post } from '../api';
import { applyMapping, findHeaderRow, guessMapping, isComplete, parseCsv, type Field, type ImportRow, type Mapping } from '../lib/csv';
import { t } from '../lib/strings';
import { Sheet, toast } from './ui';

const FIELDS: Array<{ f: Field; label: string; required?: boolean }> = [
  { f: 'symbol', label: 'Symbol' }, { f: 'name', label: 'Naam' },
  { f: 'qty', label: 'Quantity', required: true }, { f: 'avg', label: 'Avg price', required: true },
];

export function ImportSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [headerIdx, setHeaderIdx] = useState(0);
  const [map, setMap] = useState<Mapping>({});
  const [preview, setPreview] = useState<ImportRow[] | null>(null);
  const [broker, setBroker] = useState('Groww');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() { setRows(null); setPreview(null); setErr(null); setMap({}); }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setErr(null);
    if (/\.xlsx?$/i.test(file.name)) { setErr('Excel file ko pehle CSV mein save karo (Numbers app → Export → CSV), phir yahan chuno.'); return; }
    const all = parseCsv(await file.text());
    const h = findHeaderRow(all);
    const m = guessMapping(all[h] ?? []);
    setRows(all); setHeaderIdx(h); setMap(m);
    if (/upstox/i.test(file.name)) setBroker('Upstox');
    if (isComplete(m)) await buildPreview(all, h, m);
  }

  async function buildPreview(all: string[][], h: number, m: Mapping) {
    const out = applyMapping(all.slice(h + 1), m);
    // Groww exports have names but no symbols — try auto-resolving via search.
    await Promise.all(out.map(async (r) => {
      if (r.symbol) return;
      try {
        const s = await get<{ results: Array<{ symbol: string }> }>(`/api/search?q=${encodeURIComponent(r.name.replace(/\b(ltd|limited)\b\.?/gi, '').trim())}`);
        r.symbol = s.data.results[0]?.symbol ?? '';
      } catch { /* user fills manually */ }
    }));
    setPreview(out);
  }

  async function doImport(mode: 'add' | 'replace') {
    if (!preview) return;
    if (preview.some((r) => !r.symbol)) { setErr(t('holdings.needSymbol')); return; }
    if (mode === 'replace' && !confirm('Purani saari holdings hat jayengi. Pakka?')) return;
    setBusy(true);
    try {
      await post('/api/holdings/import', { mode, rows: preview.map((r) => ({ name: r.name, symbol: r.symbol, qty: r.qty, avg_price: r.avg, broker })) });
      toast(t('holdings.imported', { n: preview.length }));
      reset(); onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const headers = rows?.[headerIdx] ?? [];
  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title={t('holdings.importTitle')}>
      {!rows && (
        <>
          <p class="mb-4 text-[15px]">{t('holdings.importHint')}</p>
          <label class="btn-primary w-full flex items-center justify-center cursor-pointer">
            {t('holdings.pickFile')}
            <input type="file" accept=".csv,text/csv" class="sr-only" onChange={(e) => onFile(e.currentTarget.files?.[0])} />
          </label>
        </>
      )}
      {rows && !preview && (
        <>
          <h3 class="font-bold mb-1">{t('holdings.mapTitle')}</h3>
          <p class="text-sm text-mute mb-3">{t('holdings.mapHint')}</p>
          {FIELDS.map(({ f, label }) => (
            <label class="block mb-2" key={f}>
              <span class="label">{label}</span>
              <select value={map[f] ?? ''} onChange={(e) => setMap({ ...map, [f]: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value) })}>
                <option value="">—</option>
                {headers.map((h, i) => <option value={i} key={i}>{h || `Column ${i + 1}`}</option>)}
              </select>
            </label>
          ))}
          <button class="btn-primary w-full mt-2" disabled={!isComplete(map)} onClick={() => buildPreview(rows, headerIdx, map)}>{t('common.next')}</button>
        </>
      )}
      {preview && (
        <>
          <p class="mb-2 font-semibold">{t('holdings.preview', { n: preview.length })}</p>
          <label class="block mb-3"><span class="label">{t('holdings.broker')}</span>
            <select value={broker} onChange={(e) => setBroker(e.currentTarget.value)}><option>Groww</option><option>Upstox</option><option>Other</option></select>
          </label>
          <ul class="divide-y divide-line mb-3">
            {preview.map((r, i) => (
              <li key={i} class="py-2 flex items-center gap-2">
                <div class="flex-1 min-w-0"><div class="truncate text-sm">{r.name}</div><div class="text-xs text-mute num">{r.qty} @ {r.avg}</div></div>
                <input class="!w-32 uppercase" aria-label={`${r.name} symbol`} value={r.symbol}
                  onInput={(e) => { const v = e.currentTarget.value.toUpperCase(); setPreview(preview.map((x, j) => (j === i ? { ...x, symbol: v } : x))); }} />
              </li>
            ))}
          </ul>
          {err && <p role="alert" class="text-down mb-2">{err}</p>}
          <div class="grid grid-cols-2 gap-2">
            <button class="btn-primary" disabled={busy} onClick={() => doImport('add')}>{t('holdings.importAdd')}</button>
            <button class="btn-ghost" disabled={busy} onClick={() => doImport('replace')}>{t('holdings.importReplace')}</button>
          </div>
        </>
      )}
      {err && !preview && <p role="alert" class="text-down mt-3">{err}</p>}
    </Sheet>
  );
}
