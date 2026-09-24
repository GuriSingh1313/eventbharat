import { useState } from 'preact/hooks';
import { del, get, post, put, type Holding, type Quote } from '../api';
import { ImportSheet } from '../components/ImportSheet';
import { SymbolSearch } from '../components/SymbolSearch';
import { Explain, Field, Money, Pct, Sheet, Sparkline, tap, toast } from '../components/ui';
import { inr, istParts } from '../lib/format';
import { daysHeld, holdingPeriod, toTick } from '../lib/money';
import { t } from '../lib/strings';
import { useData, type Row } from '../store';
import { DataStatus } from './Home';

type Draft = Omit<Holding, 'id'> & { id?: number };
const blank: Draft = { name: '', symbol: '', exchange: 'NSE', qty: 0, avg_price: 0, buy_date: null, broker: 'Groww', danger_level: null };

export function Holdings() {
  const d = useData();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [importing, setImporting] = useState(false);
  const today = istParts().date;

  return (
    <div>
      <header class="flex items-center justify-between mb-3">
        <h1 class="text-[34px] font-bold tracking-tight">{t('holdings.title')}</h1>
      </header>
      <div class="grid grid-cols-2 gap-2 mb-3">
        <button class="btn-primary" onClick={() => { tap(); setEdit({ ...blank }); }}>＋ {t('holdings.add')}</button>
        <button class="btn-ghost" onClick={() => { tap(); setImporting(true); }}>{t('holdings.import')}</button>
      </div>
      <DataStatus />
      {d.rows.length === 0 && !d.loading && <p class="card p-6 text-center text-mute mt-3">{t('holdings.empty')}</p>}
      <ul class="space-y-2 mt-2">
        {d.rows.map((r) => <HoldingRow key={r.h.id} r={r} today={today} onTap={() => { tap(); setEdit({ ...r.h }); }} />)}
      </ul>
      <p class="text-xs text-mute text-center mt-4 flex items-center justify-center">
        {t('holdings.short')} / {t('holdings.long')} <Explain term="stcg" label="?" />
      </p>
      {edit && <HoldingForm draft={edit} quotes={d.quotes} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void d.refresh(); }} />}
      <ImportSheet open={importing} onClose={() => setImporting(false)} onDone={() => { setImporting(false); void d.refresh(); }} />
    </div>
  );
}

function HoldingRow({ r, today, onTap }: { r: Row; today: string; onTap: () => void }) {
  const period = holdingPeriod(r.h.buy_date, today);
  const nearDanger = r.q && r.h.danger_level && r.q.ltp <= r.h.danger_level * 1.03;
  return (
    <li>
      <button class="card w-full text-left p-4 pressable" onClick={onTap} aria-label={`${r.h.name}, ${t('common.edit')}`}>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-bold text-[17px]">{r.h.symbol} {nearDanger && <span aria-label="danger level ke paas">⚠️</span>}</div>
            <div class="text-sm text-mute truncate">{r.h.name} · {r.h.broker}</div>
          </div>
          {r.q && <Sparkline data={r.q.spark} up={r.c.dayPct >= 0} />}
          <div class="text-right shrink-0">
            <div class="font-bold num text-[17px]">{r.q ? inr(r.q.ltp) : <span class="text-mute text-sm">{t('holdings.noQuote')}</span>}</div>
            {r.q && <Pct v={r.c.dayPct} class="text-sm" />}
          </div>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div><div class="text-mute">{t('holdings.qty')}</div><div class="num font-semibold">{r.h.qty}</div></div>
          <div><div class="text-mute">{t('holdings.avg')}</div><div class="num font-semibold">{inr(r.h.avg_price)}</div></div>
          <div class="text-right"><div class="text-mute">{t('holdings.pnl')}</div><Money v={r.c.pnl} sign class="font-semibold" /><div><Pct v={r.c.pnlPct} class="text-xs" /></div></div>
        </div>
        <div class="mt-2 flex gap-2 text-xs">
          <span class={`rounded-full px-2 py-0.5 ${period === 'long' ? 'bg-up/15 text-up' : 'bg-line/60 text-mute'}`}>
            {period === 'long' ? t('holdings.long') : period === 'short' ? t('holdings.short') : t('holdings.unknownPeriod')}
            {r.h.buy_date ? ` · ${t('holdings.held', { days: daysHeld(r.h.buy_date, today) })}` : ''}
          </span>
          {r.h.danger_level ? <span class="rounded-full px-2 py-0.5 bg-down/10 text-down">⚠️ {inr(r.h.danger_level)}</span> : null}
        </div>
      </button>
    </li>
  );
}

function HoldingForm({ draft, quotes, onClose, onSaved }: { draft: Draft; quotes: Record<string, Quote>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Draft>(draft);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((x) => ({ ...x, [k]: v }));

  async function prefillDanger(symbol: string) {
    if (f.danger_level) return;
    try {
      const [s, q] = await Promise.all([
        get<{ settings: Record<string, string> }>('/api/settings'),
        quotes[symbol] ? Promise.resolve({ data: { quotes: { [symbol]: quotes[symbol]! } } }) : get<{ quotes: Record<string, Quote> }>(`/api/quotes?symbols=${symbol}`),
      ]);
      const ltp = q.data.quotes[symbol]?.ltp;
      const pctDown = Number(s.data.settings.danger_default_pct ?? 7);
      if (ltp) set('danger_level', toTick(ltp * (1 - pctDown / 100), 0.05, 'down'));
    } catch { /* optional */ }
  }

  async function save(e: Event) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (f.id) await put(`/api/holdings/${f.id}`, f); else await post('/api/holdings', f);
      toast('Save ho gaya ✓');
      onSaved();
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!f.id || !confirm(t('common.confirmDelete'))) return;
    await del(`/api/holdings/${f.id}`);
    toast('Hata diya');
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} title={f.id ? `${f.symbol} ${t('common.edit')}` : t('holdings.add')}>
      <form onSubmit={save}>
        <Field label={t('holdings.symbol')}>
          <SymbolSearch value={f.symbol} onInput={(v) => set('symbol', v)}
            onPick={(h) => { setF((x) => ({ ...x, symbol: h.symbol, exchange: h.exchange, name: x.name || h.name })); void prefillDanger(h.symbol); }} />
        </Field>
        <Field label={t('holdings.name')}><input value={f.name} onInput={(e) => set('name', e.currentTarget.value)} /></Field>
        <div class="grid grid-cols-2 gap-3">
          <Field label={t('holdings.qty')}><input inputMode="numeric" value={f.qty || ''} onInput={(e) => set('qty', Number(e.currentTarget.value))} required /></Field>
          <Field label={t('holdings.avg')} explain="avg"><input inputMode="decimal" value={f.avg_price || ''} onInput={(e) => set('avg_price', Number(e.currentTarget.value))} required /></Field>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Field label={t('holdings.buyDate')}><input type="date" value={f.buy_date ?? ''} onInput={(e) => set('buy_date', e.currentTarget.value || null)} /></Field>
          <Field label={t('holdings.broker')}>
            <select value={f.broker} onChange={(e) => set('broker', e.currentTarget.value)}>
              <option>Groww</option><option>Upstox</option><option>Other</option>
            </select>
          </Field>
        </div>
        <Field label={t('holdings.danger')} explain="danger" hint={t('holdings.dangerHint')}>
          <input inputMode="decimal" value={f.danger_level ?? ''} onInput={(e) => set('danger_level', e.currentTarget.value ? Number(e.currentTarget.value) : null)} />
        </Field>
        {err && <p role="alert" class="text-down mb-3">{err}</p>}
        <button class="btn-primary w-full" disabled={busy}>{busy ? t('common.loading') : t('common.save')}</button>
        {f.id && <button type="button" class="btn-danger w-full mt-2" onClick={remove}>{t('common.delete')}</button>}
      </form>
    </Sheet>
  );
}
