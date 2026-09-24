import { useEffect, useMemo, useState } from 'preact/hooks';
import { get, type Quote } from '../api';
import { SymbolSearch } from '../components/SymbolSearch';
import { Banner, CopyButton, Explain, Field, Money } from '../components/ui';
import { inr, istTime } from '../lib/format';
import { buildOrderCard, slLimitFor, suggest, type Intent } from '../lib/orderCard';
import { t } from '../lib/strings';
import { useData } from '../store';

const INTENTS: Intent[] = ['sell', 'buy', 'stoploss', 'target'];
const n = (s: string) => (s.trim() === '' ? undefined : Number(s));

export function OrderCardScreen() {
  const d = useData();
  const [symbol, setSymbol] = useState(d.holdings[0]?.symbol ?? '');
  const [intent, setIntent] = useState<Intent>('stoploss');
  const [extQuote, setExtQuote] = useState<Quote | null>(null);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [trigger, setTrigger] = useState('');
  const [limit, setLimit] = useState('');
  const [target, setTarget] = useState('');

  const holding = d.holdings.find((h) => h.symbol === symbol);
  const quote = d.quotes[symbol] ?? extQuote ?? undefined;
  const ltp = quote?.ltp ?? 0;

  useEffect(() => {
    if (!symbol || d.quotes[symbol]) { setExtQuote(null); return; }
    let live = true;
    get<{ quotes: Record<string, Quote> }>(`/api/quotes?symbols=${symbol}`).then((r) => live && setExtQuote(r.data.quotes[symbol] ?? null)).catch(() => {});
    return () => { live = false; };
  }, [symbol]);

  // Reset suggestions whenever stock / intent / price source changes.
  useEffect(() => {
    if (!ltp) return;
    const s = suggest(intent, ltp, holding?.danger_level);
    setQty(String(intent === 'buy' ? 1 : holding?.qty ?? 1));
    setPrice(s.price ? String(s.price) : '');
    setTrigger(s.trigger ? String(s.trigger) : '');
    setLimit(s.limit ? String(s.limit) : '');
    setTarget('');
  }, [symbol, intent, ltp > 0]);

  const card = useMemo(() => ltp > 0 ? buildOrderCard({
    intent, ltp, qty: Number(qty), heldQty: holding?.qty ?? 0, avgPrice: holding?.avg_price ?? 0,
    price: n(price), trigger: n(trigger), limit: n(limit), target: n(target),
  }) : null, [intent, ltp, qty, price, trigger, limit, target, holding]);

  return (
    <div>
      <h1 class="text-[34px] font-bold tracking-tight">{t('order.title')}</h1>
      <p class="text-mute mb-4">{t('order.sub')}</p>

      <section class="card p-4 mb-3">
        <Field label={t('order.pick')}>
          {d.holdings.length > 0 && (
            <div class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {d.holdings.map((h) => (
                <button key={h.id} type="button" onClick={() => setSymbol(h.symbol)} aria-pressed={symbol === h.symbol}
                  class={`shrink-0 rounded-full px-4 text-[15px] font-semibold ${symbol === h.symbol ? 'bg-accent text-white' : 'bg-line/60'}`}>{h.symbol}</button>
              ))}
            </div>
          )}
          <SymbolSearch value={symbol} onPick={(h) => setSymbol(h.symbol)} />
        </Field>
        {quote ? (
          <p class="text-[15px]">{t('order.ltp')}: <span class="font-bold num text-xl">{inr(ltp)}</span> <span class="text-xs text-mute">({istTime(quote.time)})</span></p>
        ) : symbol ? <p class="text-mute">{t('common.loading')}</p> : <p class="text-mute">{t('order.noStock')}</p>}
      </section>

      <section class="mb-3">
        <div class="label px-1">{t('order.intent')}</div>
        <div class="grid grid-cols-2 gap-2">
          {INTENTS.map((i) => (
            <button key={i} type="button" aria-pressed={intent === i} onClick={() => setIntent(i)}
              class={`card rounded-xl py-3 font-semibold text-[16px] pressable ${intent === i ? 'ring-2 ring-accent text-accent' : ''}`}>
              {t(`order.intents.${i}`)}
            </button>
          ))}
        </div>
      </section>

      {ltp > 0 && card && (
        <>
          <section class="card p-4 mb-3">
            {intent === 'stoploss' ? (
              <div class="grid grid-cols-2 gap-3">
                <Field label={t('order.trigger')} explain="trigger">
                  <input inputMode="decimal" value={trigger} onInput={(e) => { const v = e.currentTarget.value; setTrigger(v); if (Number(v) > 0) setLimit(String(slLimitFor(Number(v)))); }} />
                </Field>
                <Field label={t('order.limit')} explain="limit"><input inputMode="decimal" value={limit} onInput={(e) => setLimit(e.currentTarget.value)} /></Field>
              </div>
            ) : (
              <Field label={t('order.price')} explain="limit"><input inputMode="decimal" value={price} onInput={(e) => setPrice(e.currentTarget.value)} /></Field>
            )}
            <div class="grid grid-cols-2 gap-3">
              <Field label={t('order.qty')}><input inputMode="numeric" value={qty} onInput={(e) => setQty(e.currentTarget.value)} /></Field>
              {intent !== 'target' && <Field label={t('order.target')}><input inputMode="decimal" value={target} onInput={(e) => setTarget(e.currentTarget.value)} /></Field>}
            </div>
          </section>

          {card.errors.length > 0 && (
            <Banner kind="error"><b>{t('order.fixErrors')}</b><ul class="list-disc pl-5 mt-1">{card.errors.map((e) => <li key={e}>{e}</li>)}</ul></Banner>
          )}
          {card.warnings.length > 0 && (
            <div class="mt-2"><Banner kind="warn"><b>{t('order.careful')}</b><ul class="list-disc pl-5 mt-1">{card.warnings.map((e) => <li key={e}>{e}</li>)}</ul></Banner></div>
          )}

          <section class={`card p-4 mt-3 border-2 ${card.errors.length ? 'border-down/40 opacity-60' : 'border-accent'}`} aria-label={t('order.card')}>
            <h2 class="font-bold text-lg mb-2">📋 {t('order.card')} — {symbol}</h2>
            <dl class="divide-y divide-line">
              {card.fields.map((f) => (
                <div key={f.key} class="flex items-center justify-between py-2.5 gap-2">
                  <dt class="text-mute text-[15px] flex items-center">
                    {f.label}
                    {f.key === 'product' && <Explain term="delivery" label="?" />}
                    {f.key === 'validity' && <Explain term="validity" label="?" />}
                    {f.key === 'type' && intent === 'stoploss' && <Explain term="stoploss" label="?" />}
                  </dt>
                  <dd class="flex items-center gap-2">
                    <span class="font-bold text-[20px] num">{f.value}</span>
                    {f.copy && !card.errors.length && <CopyButton value={f.copy} />}
                  </dd>
                </div>
              ))}
            </dl>
            <p class="mt-3 text-[16px] leading-relaxed bg-bg rounded-xl p-3">💬 {card.explanation}</p>
            {(card.pnlAtTrigger !== null || card.pnlAtTarget !== null) && (
              <div class="mt-3 grid grid-cols-2 gap-2 text-center">
                {card.pnlAtTrigger !== null && <div class="bg-bg rounded-xl p-2"><div class="text-xs text-mute">{t('order.pnlAtExit')}</div><Money v={card.pnlAtTrigger} sign class="font-bold text-lg" /></div>}
                {card.pnlAtTarget !== null && <div class="bg-bg rounded-xl p-2"><div class="text-xs text-mute">{t('order.pnlAtTarget')}</div><Money v={card.pnlAtTarget} sign class="font-bold text-lg" /></div>}
              </div>
            )}
            <p class="text-xs text-mute mt-2">{t('order.charges')}</p>
          </section>
          <p class="text-center text-sm text-mute mt-4">🔒 {t('order.never')}</p>
        </>
      )}
    </div>
  );
}

