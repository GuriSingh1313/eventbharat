import { useEffect, useState } from 'preact/hooks';
import { get, post, put } from '../api';
import { t } from '../lib/strings';
import { Sheet, toast } from './ui';

interface Chat { id: string; name: string }

export function TelegramWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [token, setToken] = useState('');
  const [tokenSet, setTokenSet] = useState(false);
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    get<{ settings: Record<string, string>; telegramTokenSet: boolean }>('/api/settings').then((r) => {
      setTokenSet(r.data.telegramTokenSet);
      setPicked(JSON.parse(r.data.settings.telegram_chat_ids ?? '[]') as string[]);
    }).catch(() => {});
  }, [open]);

  async function detect(): Promise<boolean> {
    setBusy(true); setErr(null);
    try {
      const r = await post<{ bot: string; chats: Chat[] }>('/api/telegram/detect', token ? { token } : {});
      setTokenSet(true); setToken('');
      setChats(r.chats);
      setPicked((p) => [...new Set([...p, ...r.chats.map((c) => c.id)])]);
      return true;
    } catch (e) { setErr((e as Error).message); return false; } finally { setBusy(false); }
  }
  async function saveAndTest() {
    setBusy(true); setErr(null);
    try {
      await put('/api/settings', { telegram_chat_ids: picked });
      await post('/api/telegram/test');
      toast(t('tg.testOk'));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const steps = [
    { title: t('tg.s1t'), body: t('tg.s1') },
    { title: t('tg.s2t'), body: t('tg.s2') },
    { title: t('tg.s3t'), body: t('tg.s3') },
    { title: t('tg.s4t'), body: t('tg.s4') },
  ];
  const s = steps[step]!;
  return (
    <Sheet open={open} onClose={onClose} title={t('alerts.telegram')}>
      <ol class="flex gap-1 mb-4" aria-label="Steps">
        {steps.map((_, i) => <li key={i} class={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-line'}`} aria-current={i === step ? 'step' : undefined} />)}
      </ol>
      <h3 class="text-xl font-bold mb-2">Step {step + 1}: {s.title}</h3>
      <p class="text-[16px] leading-relaxed mb-3">{s.body}</p>
      <div class="rounded-xl border-2 border-dashed border-line h-32 flex items-center justify-center text-mute text-sm mb-4">{t('tg.shot')}</div>

      {step === 1 && (
        <div class="mb-3">
          <input value={token} placeholder={tokenSet ? '✓ Token save hai (badalna ho toh naya daalo)' : t('tg.tokenPh')} autocomplete="off" autocapitalize="off" spellcheck={false}
            onInput={(e) => setToken(e.currentTarget.value)} aria-label="Bot token" />
        </div>
      )}
      {step === 3 && (
        <div class="mb-3">
          <button class="btn-ghost w-full mb-3" disabled={busy} onClick={() => void detect()}>{busy ? t('common.loading') : `🔍 ${t('tg.detect')}`}</button>
          {chats && chats.length === 0 && <p class="text-sm text-down mb-2">{t('tg.none')}</p>}
          {chats && chats.map((c) => (
            <label key={c.id} class="flex items-center gap-3 py-2 min-h-[44px]">
              <input type="checkbox" class="!w-6 !min-h-0 h-6" checked={picked.includes(c.id)}
                onChange={(e) => setPicked(e.currentTarget.checked ? [...picked, c.id] : picked.filter((x) => x !== c.id))} />
              <span>{c.name} <span class="text-xs text-mute">({c.id})</span></span>
            </label>
          ))}
          {picked.length > 0 && <p class="text-sm text-mute mb-2">Saved IDs: {picked.join(', ')}</p>}
          <button class="btn-primary w-full" disabled={busy || picked.length === 0} onClick={saveAndTest}>✅ {t('tg.saveIds')} + {t('tg.test')}</button>
        </div>
      )}
      {err && <p role="alert" class="text-down mb-3">{err}</p>}
      <div class="grid grid-cols-2 gap-2">
        <button class="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>{t('common.back')}</button>
        {step < 3 ? (
          <button class="btn-primary" onClick={async () => {
            if (step === 1 && token && !(await detect())) return;
            setStep(step + 1);
          }}>{t('common.next')}</button>
        ) : <button class="btn-primary" onClick={onClose}>{t('common.done')}</button>}
      </div>
    </Sheet>
  );
}
