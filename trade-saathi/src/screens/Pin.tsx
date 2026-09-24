import { useState } from 'preact/hooks';
import { post } from '../api';
import { tap } from '../components/ui';
import { t } from '../lib/strings';

export function PinScreen({ mode, onDone }: { mode: 'setup' | 'login'; onDone: () => void }) {
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = mode === 'login' ? t('pin.enterTitle') : first ? t('pin.confirmTitle') : t('pin.setTitle');
  const hint = mode === 'login' ? t('pin.enterHint') : t('pin.setHint');

  async function submit() {
    if (pin.length < 4 || busy) return;
    setErr(null);
    if (mode === 'setup' && !first) { setFirst(pin); setPin(''); return; }
    if (mode === 'setup' && first !== pin) { setErr(t('pin.mismatch')); setFirst(null); setPin(''); return; }
    setBusy(true);
    try {
      await post(mode === 'setup' ? '/api/auth/setup' : '/api/auth/login', { pin });
      onDone();
    } catch (e) { setErr((e as Error).message); setPin(''); } finally { setBusy(false); }
  }

  const press = (k: string) => {
    tap();
    if (k === '⌫') setPin((p) => p.slice(0, -1));
    else if (pin.length < 6) setPin((p) => p + k);
  };

  return (
    <main class="min-h-[100dvh] flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      <div class="text-5xl mb-2" aria-hidden="true">📈</div>
      <h1 class="text-2xl font-bold">{title}</h1>
      <p class="text-mute mt-1 text-center">{hint}</p>
      <div class="flex gap-3 my-6" aria-label={`${pin.length} digits entered`} role="status">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} class={`h-4 w-4 rounded-full border-2 ${i < pin.length ? 'bg-ink border-ink' : 'border-mute'} ${i >= 4 ? 'opacity-60' : ''}`} />
        ))}
      </div>
      {err && <p role="alert" class="text-down mb-3 text-center">{err}</p>}
      <div class="grid grid-cols-3 gap-4 w-full max-w-[300px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => k === '' ? <span key="blank" /> : (
          <button key={k} type="button" onClick={() => press(k)} aria-label={k === '⌫' ? 'Mitao' : k}
            class="h-[72px] rounded-full bg-card text-[28px] font-medium active:bg-line transition">{k}</button>
        ))}
      </div>
      <button class="btn-primary w-full max-w-[300px] mt-6" disabled={pin.length < 4 || busy} onClick={submit}>
        {busy ? t('common.loading') : mode === 'setup' && !first ? t('common.next') : t('pin.go')}
      </button>
    </main>
  );
}
