import { useEffect, useState } from 'preact/hooks';
import { PullToRefresh } from '../components/PullToRefresh';
import { Banner, Explain, Money, Pct } from '../components/ui';
import { istParts, istTime, pct } from '../lib/format';
import { marketState } from '../lib/market';
import { t } from '../lib/strings';
import { useData } from '../store';

export function MarketBadge() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(iv); }, []);
  const st = marketState(now);
  const open = st === 'open';
  return (
    <span class={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${open ? 'bg-up/15 text-up' : 'bg-line/60 text-mute'}`}>
      <span class={`h-2 w-2 rounded-full ${open ? 'bg-up animate-pulse' : 'bg-mute'}`} aria-hidden="true" />
      {t(`market.${st}`)} · {istTime(now)}
    </span>
  );
}

export function DataStatus() {
  const d = useData();
  const stale = d.fetchedAt && d.missing.length > 0;
  return (
    <div class="space-y-2">
      {d.offline && <Banner kind="warn">📡 {t('common.offline')}</Banner>}
      {d.error && !d.offline && <Banner kind="error">{t('common.error', { msg: d.error })}</Banner>}
      {stale && <Banner kind="info">⏳ {t('common.stale')} ({d.missing.join(', ')})</Banner>}
    </div>
  );
}

export function Home({ go }: { go: (tab: 'holdings') => void }) {
  const d = useData();
  const p = d.port;
  const allQuoted = d.rows.every((r) => r.q);
  const movers = [...d.rows].filter((r) => r.q).sort((a, b) => Math.abs(b.c.dayPct) - Math.abs(a.c.dayPct)).slice(0, 3);

  return (
    <PullToRefresh onRefresh={d.refresh}>
      <header class="mb-4">
        <h1 class="text-[34px] font-bold tracking-tight mb-1">{t('home.title')}</h1>
        <MarketBadge />
      </header>
      <DataStatus />

      {d.holdings.length === 0 && !d.loading ? (
        <div class="card p-6 text-center mt-4">
          <p class="text-lg mb-4">{t('home.empty')}</p>
          <button class="btn-primary w-full" onClick={() => go('holdings')}>{t('home.emptyCta')}</button>
        </div>
      ) : (
        <>
          <section class="card p-5 mt-3" aria-label={t('home.totalPnl')}>
            <div class="text-mute text-[15px]">{t('home.current')}</div>
            <div class="text-[40px] leading-tight font-bold num">{d.loading && !d.fetchedAt ? '…' : <Money v={p.value} neutral />}</div>
            <div class="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div class="text-mute text-sm flex items-center">{t('home.totalPnl')}<Explain term="pnl" label="?" /></div>
                <div class="text-xl font-bold"><Money v={p.pnl} sign /></div>
                <Pct v={p.pnlPct} class="text-sm" />
              </div>
              <div>
                <div class="text-mute text-sm flex items-center">{t('home.today')}<Explain term="daymove" label="?" /></div>
                <div class="text-xl font-bold"><Money v={p.dayChange} sign /></div>
                <Pct v={p.dayPct} class="text-sm" />
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-line text-mute text-sm flex justify-between">
              <span>{t('home.invested')}</span><Money v={p.invested} neutral class="text-ink font-semibold" />
            </div>
          </section>

          <section class={`card p-5 mt-3 ${allQuoted && p.neededForGreenPct === 0 ? 'bg-up/10' : ''}`}>
            {!allQuoted ? (
              <p class="text-[17px] text-mute">⏳ {t('home.partial')}</p>
            ) : p.neededForGreenPct > 0 ? (
              <>
                <p class="text-[22px] font-bold leading-snug">{t('home.needGreen', { pct: pct(p.neededForGreenPct, { sign: false }) })}</p>
                <Explain term="green" label="Itna zyada kyun?" />
              </>
            ) : (
              <p class="text-[22px] font-bold">{t('home.isGreen')}</p>
            )}
          </section>

          {movers.length > 0 && (
            <section class="mt-5">
              <h2 class="text-mute text-sm font-semibold uppercase tracking-wide mb-2 px-1">{t('home.movers')}</h2>
              <ul class="card divide-y divide-line">
                {movers.map((r) => (
                  <li key={r.h.id} class="flex items-center justify-between px-4 py-3">
                    <div><div class="font-semibold">{r.h.symbol}</div><div class="text-sm text-mute truncate max-w-[160px]">{r.h.name}</div></div>
                    <div class="text-right"><Pct v={r.c.dayPct} class="font-semibold" /><div class="text-sm"><Money v={r.c.dayChange} sign /></div></div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p class="text-center text-mute text-sm mt-5 px-4">{t('home.calm')}</p>
        </>
      )}
      {d.fetchedAt && <p class="text-center text-xs text-mute mt-3">{t('common.lastUpdated', { time: istTime(d.fetchedAt) })} · {istParts(new Date(d.fetchedAt)).date}</p>}
      <p class="text-center text-xs text-mute mt-1">{t('home.pull')}</p>
    </PullToRefresh>
  );
}
