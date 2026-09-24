import { useEffect, useState } from 'preact/hooks';
import { del, get, post, put } from '../api';
import { InstallGuide } from '../components/InstallGuide';
import { TelegramWizard } from '../components/TelegramWizard';
import { Field, Segmented, Sheet, toast } from '../components/ui';
import { istDateLabel } from '../lib/format';
import { t } from '../lib/strings';

export const APP_VERSION = '0.1.0';

export function getCb(): boolean { try { return localStorage.getItem('ts:cb') === '1'; } catch { return false; } }
export function applyCb(on: boolean) {
  document.documentElement.dataset.cb = on ? '1' : '0';
  try { localStorage.setItem('ts:cb', on ? '1' : '0'); } catch { /* ignore */ }
}

export function Settings({ onLogout }: { onLogout: () => void }) {
  const [s, setS] = useState<Record<string, string>>({});
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string }>>([]);
  const [cb, setCb] = useState(getCb());
  const [pinOpen, setPinOpen] = useState(false);
  const [hOpen, setHOpen] = useState(false);
  const [tgOpen, setTgOpen] = useState(false);
  const [install, setInstall] = useState(false);

  async function load() {
    const [a, b] = await Promise.all([get<{ settings: Record<string, string> }>('/api/settings'), get<{ holidays: Array<{ date: string; name: string }> }>('/api/holidays')]);
    setS(a.data.settings); setHolidays(b.data.holidays);
  }
  useEffect(() => { void load().catch(() => {}); }, []);

  async function saveDanger(v: string) {
    await put('/api/settings', { danger_default_pct: v });
    toast('Save ✓');
  }

  async function exportAll() {
    const r = await get<unknown>('/api/export');
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trade-saathi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function importAll(file: File | undefined) {
    if (!file || !confirm('Abhi ka saara data backup file se badal jayega. Pakka?')) return;
    try {
      await post('/api/import', JSON.parse(await file.text()));
      toast(t('settings.restored'));
      setTimeout(() => location.reload(), 800);
    } catch (e) { alert((e as Error).message); }
  }

  const ids = (() => { try { return (JSON.parse(s.telegram_chat_ids ?? '[]') as string[]).join(', '); } catch { return ''; } })();
  const Row = (p: { label: string; value?: string; onClick: () => void }) => (
    <li><button class="w-full flex items-center justify-between px-4 py-3 text-left pressable" onClick={p.onClick}>
      <span>{p.label}</span><span class="text-mute text-sm truncate max-w-[45%]">{p.value} ›</span></button></li>
  );

  return (
    <div>
      <h1 class="text-[34px] font-bold tracking-tight mb-3">{t('settings.title')}</h1>
      <ul class="card divide-y divide-line mb-4">
        <Row label={`🔐 ${t('settings.pin')}`} onClick={() => setPinOpen(true)} />
        <Row label={`✈️ ${t('settings.chatIds')}`} value={ids || '—'} onClick={() => setTgOpen(true)} />
        <Row label={`📅 ${t('settings.holidays')}`} value={String(holidays.length)} onClick={() => setHOpen(true)} />
        <Row label={`📲 ${t('settings.install')}`} onClick={() => setInstall(true)} />
      </ul>

      <section class="card p-4 mb-4">
        <Field label={t('settings.dangerDefault')} explain="danger">
          <select value={s.danger_default_pct ?? '7'} onChange={(e) => { setS({ ...s, danger_default_pct: e.currentTarget.value }); void saveDanger(e.currentTarget.value); }}>
            {['3', '5', '7', '10', '15'].map((v) => <option key={v} value={v}>−{v}%</option>)}
          </select>
        </Field>
        <span class="label">{t('settings.colors')}</span>
        <Segmented label={t('settings.colors')} value={cb ? 'cb' : 'n'} onChange={(v) => { setCb(v === 'cb'); applyCb(v === 'cb'); }}
          options={[{ v: 'n', label: t('settings.colorsNormal') }, { v: 'cb', label: t('settings.colorsCb') }]} />
        <div class="flex justify-around mt-2 text-sm"><span class="text-up font-semibold">▲ +₹1,234</span><span class="text-down font-semibold">▼ −₹567</span></div>
      </section>

      <section class="card p-4 mb-4">
        <h2 class="font-semibold mb-2">💾 {t('settings.backup')}</h2>
        <button class="btn-ghost w-full mb-2" onClick={exportAll}>{t('settings.export')}</button>
        <label class="btn-ghost w-full flex items-center justify-center cursor-pointer">{t('settings.importJson')}
          <input type="file" accept="application/json,.json" class="sr-only" onChange={(e) => importAll(e.currentTarget.files?.[0])} /></label>
      </section>

      <section class="card p-4 mb-4">
        <h2 class="font-semibold mb-2">ℹ️ {t('settings.about')}</h2>
        <p class="text-[15px] leading-relaxed">{t('settings.aboutText')}</p>
        <p class="text-xs text-mute mt-2">{t('settings.version', { v: APP_VERSION })}</p>
      </section>
      <button class="btn-danger w-full" onClick={async () => { await post('/api/auth/logout'); onLogout(); }}>{t('settings.logout')}</button>

      <PinChange open={pinOpen} onClose={() => setPinOpen(false)} />
      <TelegramWizard open={tgOpen} onClose={() => { setTgOpen(false); void load(); }} />
      <InstallGuide open={install} onClose={() => setInstall(false)} />
      <Sheet open={hOpen} onClose={() => setHOpen(false)} title={t('settings.holidays')}>
        <HolidayAdd onAdded={load} />
        <ul class="divide-y divide-line">
          {holidays.map((h) => (
            <li key={h.date} class="flex items-center justify-between py-2">
              <span><span class="font-semibold">{istDateLabel(h.date)}</span> <span class="text-mute text-sm">{h.name}</span></span>
              <button class="text-down px-2" aria-label={`${h.name} ${t('common.delete')}`} onClick={async () => { await del(`/api/holidays?date=${h.date}`); void load(); }}>✕</button>
            </li>
          ))}
        </ul>
        <p class="text-xs text-mute mt-3">Kisi din Yahoo pe aaj ki koi candle nahi mili, toh bhi us din ko chhutti maan lete hain.</p>
      </Sheet>
    </div>
  );
}

function HolidayAdd({ onAdded }: { onAdded: () => void }) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  return (
    <form class="flex gap-2 mb-3" onSubmit={async (e) => { e.preventDefault(); await post('/api/holidays', { date, name }); setDate(''); setName(''); onAdded(); }}>
      <input type="date" value={date} onInput={(e) => setDate(e.currentTarget.value)} required aria-label="Date" />
      <input value={name} placeholder="Naam" onInput={(e) => setName(e.currentTarget.value)} aria-label="Naam" />
      <button class="btn-primary shrink-0">＋</button>
    </form>
  );
}

function PinChange({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [oldPin, setOld] = useState('');
  const [newPin, setNew] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={onClose} title={t('settings.pin')}>
      <form onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        try { await post('/api/auth/change-pin', { oldPin, newPin }); toast(t('settings.pinChanged')); setOld(''); setNew(''); onClose(); }
        catch (x) { setErr((x as Error).message); }
      }}>
        <Field label={t('settings.oldPin')}><input type="password" inputMode="numeric" autocomplete="current-password" value={oldPin} onInput={(e) => setOld(e.currentTarget.value)} /></Field>
        <Field label={t('settings.newPin')}><input type="password" inputMode="numeric" autocomplete="new-password" maxLength={6} value={newPin} onInput={(e) => setNew(e.currentTarget.value)} /></Field>
        {err && <p role="alert" class="text-down mb-3">{err}</p>}
        <button class="btn-primary w-full">{t('common.save')}</button>
      </form>
    </Sheet>
  );
}
