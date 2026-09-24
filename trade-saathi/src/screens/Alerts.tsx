import { useEffect, useState } from 'preact/hooks';
import { del, get, post, put, type AlertRow } from '../api';
import { SymbolSearch } from '../components/SymbolSearch';
import { TelegramWizard } from '../components/TelegramWizard';
import { Banner, Explain, Field, Sheet, tap, toast } from '../components/ui';
import type { AlertKind } from '../lib/alerts';
import { inr, istTime } from '../lib/format';
import { t } from '../lib/strings';
import { useData } from '../store';

const KINDS: AlertKind[] = ['danger', 'below', 'above', 'day_move', 'buy_level', 'portfolio_green'];
interface LogRow { date: string; key: string; message: string; sent_at: number }

export function Alerts() {
  const d = useData();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [tgOk, setTgOk] = useState<boolean | null>(null);
  const [edit, setEdit] = useState<Partial<AlertRow> | null>(null);
  const [wizard, setWizard] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const [a, s] = await Promise.all([
        get<{ alerts: AlertRow[]; log: LogRow[] }>('/api/alerts'),
        get<{ settings: Record<string, string>; telegramTokenSet: boolean }>('/api/settings'),
      ]);
      setAlerts(a.data.alerts); setLog(a.data.log);
      const ids = JSON.parse(s.data.settings.telegram_chat_ids ?? '[]') as string[];
      setTgOk(s.data.telegramTokenSet && ids.length > 0);
    } catch (e) { setErr((e as Error).message); }
  }
  useEffect(() => { void load(); }, []);

  async function toggle(a: AlertRow) {
    tap();
    await put(`/api/alerts/${a.id}`, { ...a, active: !a.active });
    void load();
  }

  async function checkNow() {
    try {
      const r = await post<{ sent: string[]; skipped?: string }>('/api/alerts/run?force=1&dry=1');
      alert(r.sent.length ? `Abhi ye alerts banenge:\n\n${r.sent.join('\n\n')}` : 'Abhi koi alert nahi bana — sab theek hai. 🙏');
    } catch (e) { toast((e as Error).message); }
  }

  const describe = (a: AlertRow) => a.kind === 'portfolio_green' ? t('alerts.kinds.portfolio_green')
    : a.kind === 'day_move' ? `± ${a.value}%` : inr(a.value);

  return (
    <div>
      <h1 class="text-[34px] font-bold tracking-tight mb-3">{t('alerts.title')}</h1>
      <button class={`card w-full p-4 text-left pressable mb-3 ${tgOk ? '' : 'ring-2 ring-yellow-400'}`} onClick={() => setWizard(true)}>
        <div class="font-semibold">✈️ {t('alerts.telegram')}</div>
        <div class={`text-sm ${tgOk ? 'text-up' : 'text-mute'}`}>{tgOk === null ? '…' : tgOk ? t('alerts.telegramOk') : t('alerts.telegramNo')}</div>
      </button>
      {err && <Banner kind="error">{err}</Banner>}
      <div class="grid grid-cols-2 gap-2 mb-3">
        <button class="btn-primary" onClick={() => setEdit({ kind: 'danger', symbol: d.holdings[0]?.symbol ?? '', value: 0, active: 1 })}>＋ {t('alerts.add')}</button>
        <button class="btn-ghost" onClick={checkNow}>{t('alerts.checkNow')}</button>
      </div>
      <p class="text-sm text-mute mb-3 px-1">🕞 {t('alerts.summaryNote')}</p>
      {alerts.length === 0 ? <p class="card p-6 text-center text-mute">{t('alerts.empty')}</p> : (
        <ul class="card divide-y divide-line">
          {alerts.map((a) => (
            <li key={a.id} class="flex items-center gap-2 px-4 py-2">
              <button class="flex-1 text-left py-1 min-w-0" onClick={() => setEdit(a)}>
                <div class="font-semibold">{a.symbol ?? '📊 Portfolio'} <span class="text-mute font-normal">· {t(`alerts.kinds.${a.kind}`)}</span></div>
                <div class="text-sm num">{describe(a)}{a.label ? ` · ${a.label}` : ''}</div>
              </button>
              <button role="switch" aria-checked={!!a.active} aria-label={`${a.symbol ?? ''} ${t(`alerts.kinds.${a.kind}`)}`} onClick={() => toggle(a)}
                class={`relative w-[51px] h-[31px] min-h-0 rounded-full transition ${a.active ? 'bg-up' : 'bg-line'}`}>
                <span class={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all ${a.active ? 'left-[22px]' : 'left-[2px]'}`} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {log.length > 0 && (
        <section class="mt-5">
          <h2 class="text-mute text-sm font-semibold uppercase tracking-wide mb-2 px-1">{t('alerts.history')}</h2>
          <ul class="card divide-y divide-line">
            {log.slice(0, 10).map((l) => (
              <li key={l.date + l.key} class="px-4 py-2 text-sm"><div class="text-xs text-mute">{l.date} · {istTime(l.sent_at * 1000)}</div><div class="whitespace-pre-line line-clamp-3">{l.message}</div></li>
            ))}
          </ul>
        </section>
      )}
      {edit && <AlertForm a={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void load(); }} />}
      <TelegramWizard open={wizard} onClose={() => { setWizard(false); void load(); }} />
    </div>
  );
}

function AlertForm({ a, onClose, onSaved }: { a: Partial<AlertRow>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(a);
  const [err, setErr] = useState<string | null>(null);
  const kind = f.kind ?? 'danger';

  async function save(e: Event) {
    e.preventDefault();
    try {
      if (f.id) await put(`/api/alerts/${f.id}`, f); else await post('/api/alerts', f);
      toast('Alert save ✓'); onSaved();
    } catch (x) { setErr((x as Error).message); }
  }
  async function remove() {
    if (!f.id || !confirm(t('common.confirmDelete'))) return;
    await del(`/api/alerts/${f.id}`); onSaved();
  }

  return (
    <Sheet open onClose={onClose} title={f.id ? t('common.edit') : t('alerts.add')}>
      <form onSubmit={save}>
        <Field label="Type" explain={kind === 'danger' ? 'danger' : kind === 'day_move' ? 'daymove' : undefined}>
          <select value={kind} onChange={(e) => setF({ ...f, kind: e.currentTarget.value as AlertKind })}>
            {KINDS.map((k) => <option value={k} key={k}>{t(`alerts.kinds.${k}`)}</option>)}
          </select>
        </Field>
        {kind !== 'portfolio_green' && (
          <>
            <Field label="Stock"><SymbolSearch value={f.symbol ?? ''} onInput={(v) => setF((x) => ({ ...x, symbol: v }))} onPick={(h) => setF((x) => ({ ...x, symbol: h.symbol }))} /></Field>
            <Field label={kind === 'day_move' ? t('alerts.valuePct') : t('alerts.value')}>
              <input inputMode="decimal" value={f.value || ''} onInput={(e) => setF({ ...f, value: Number(e.currentTarget.value) })} required />
            </Field>
            {kind === 'buy_level' && <Field label={t('alerts.label')}><input value={f.label ?? ''} onInput={(e) => setF({ ...f, label: e.currentTarget.value })} /></Field>}
          </>
        )}
        {err && <p role="alert" class="text-down mb-3">{err}</p>}
        <button class="btn-primary w-full">{t('common.save')}</button>
        {f.id && <button type="button" class="btn-danger w-full mt-2" onClick={remove}>{t('common.delete')}</button>}
      </form>
    </Sheet>
  );
}
