import { cloneElement, isValidElement, type ComponentChildren } from 'preact';
import { useEffect, useId, useState } from 'preact/hooks';
import { inr, pct } from '../lib/format';
import { strings, t } from '../lib/strings';

export function tap(): void {
  // iOS Safari has no vibration API; best-effort elsewhere.
  try { navigator.vibrate?.(8); } catch { /* ignore */ }
}

export function Sheet(props: { open: boolean; onClose: () => void; title?: string; children: ComponentChildren }) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [props.open]);
  if (!props.open) return null;
  return (
    <div class="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={props.title}>
      <div class="absolute inset-0 bg-black/40 animate-fade" onClick={props.onClose} />
      <div class="relative w-full max-w-[520px] max-h-[90dvh] overflow-y-auto card rounded-b-none animate-sheet safe-bottom">
        <div class="sticky top-0 bg-card z-10 pt-2 pb-2 px-4">
          <div class="mx-auto h-1.5 w-10 rounded-full bg-line mb-2" aria-hidden="true" />
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold">{props.title}</h2>
            <button class="text-accent font-semibold px-2" onClick={props.onClose}>{t('common.close')}</button>
          </div>
        </div>
        <div class="px-4 pb-6">{props.children}</div>
      </div>
    </div>
  );
}

type TermKey = keyof typeof strings.explain;

/** Inline "ye kya hai?" link that opens a 2-line explanation sheet. */
export function Explain({ term, label }: { term: TermKey; label?: string }) {
  const [open, setOpen] = useState(false);
  const e = strings.explain[term];
  return (
    <>
      <button type="button" class="text-accent text-sm underline decoration-dotted underline-offset-2 min-h-0 px-1 py-2"
        aria-label={`${e.t}: ${t('common.whatIsThis')}`} onClick={(ev) => { ev.stopPropagation(); tap(); setOpen(true); }}>
        {label ?? t('common.whatIsThis')}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={e.t}>
        <p class="text-[17px] leading-relaxed">{e.d}</p>
        <p class="mt-3 card bg-bg p-3 text-[15px]"><span class="font-semibold">Example: </span>{e.e}</p>
      </Sheet>
    </>
  );
}

export function Money({ v, sign, neutral, class: cls = '' }: { v: number; sign?: boolean; neutral?: boolean; class?: string }) {
  const color = neutral ? '' : v > 0 ? 'text-up' : v < 0 ? 'text-down' : '';
  return <span class={`num ${color} ${cls}`}>{inr(v, { sign })}</span>;
}

export function Pct({ v, class: cls = '' }: { v: number; class?: string }) {
  const color = v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-mute';
  const arrow = v > 0 ? '▲' : v < 0 ? '▼' : '';
  return <span class={`num ${color} ${cls}`}><span aria-hidden="true">{arrow} </span>{pct(v)}</span>;
}

export function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return <div class="w-16 h-6" />;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 64},${24 - ((v - min) / span) * 22 - 1}`).join(' ');
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" aria-hidden="true" class={up ? 'text-up' : 'text-down'}>
      <polyline points={pts} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  );
}

export function Banner({ kind, children }: { kind: 'warn' | 'error' | 'info'; children: ComponentChildren }) {
  const cls = kind === 'error' ? 'bg-down/10 text-down' : kind === 'warn' ? 'bg-yellow-400/20 text-ink' : 'bg-accent/10 text-ink';
  return <div role={kind === 'error' ? 'alert' : 'status'} class={`rounded-xl px-3 py-2 text-[15px] ${cls}`}>{children}</div>;
}

let toastFn: (m: string) => void = () => {};
export function toast(m: string) { toastFn(m); }
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    toastFn = (m) => { setMsg(m); clearTimeout(timer); timer = setTimeout(() => setMsg(null), 2200); };
  }, []);
  if (!msg) return null;
  return (
    <div class="fixed left-0 right-0 z-[60] flex justify-center pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
      <div role="status" class="animate-pop bg-ink text-bg rounded-full px-4 py-2 text-[15px] font-semibold shadow-lg">{msg}</div>
    </div>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" class={`btn ${done ? 'bg-up/15 text-up' : 'bg-accent/15 text-accent'} text-[15px] min-w-[84px]`}
      aria-label={`${t('common.copy')} ${value}`}
      onClick={async () => {
        tap();
        try { await navigator.clipboard.writeText(value); } catch { /* ignore */ }
        setDone(true); setTimeout(() => setDone(false), 1500);
      }}>
      {done ? '✓' : t('common.copy')}
    </button>
  );
}

export function Field(props: { label: string; explain?: TermKey; children: ComponentChildren; hint?: string }) {
  const id = useId();
  // Give the (single) input child our id so the <label> points at it; the Explain button stays outside the label.
  const child = isValidElement(props.children) && !(props.children.props as { id?: string }).id
    ? cloneElement(props.children, { id }) : props.children;
  return (
    <div class="mb-3">
      <div class="flex items-center justify-between">
        <label for={id} class="label">{props.label}</label>
        {props.explain && <Explain term={props.explain} />}
      </div>
      {child}
      {props.hint && <span class="block text-xs text-mute mt-1">{props.hint}</span>}
    </div>
  );
}

export function Segmented<T extends string>(props: { value: T; options: Array<{ v: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={props.label} class="grid gap-1 p-1 rounded-xl bg-line/50" style={{ gridTemplateColumns: `repeat(${props.options.length}, 1fr)` }}>
      {props.options.map((o) => (
        <button type="button" role="radio" aria-checked={props.value === o.v}
          class={`rounded-lg text-[15px] font-semibold transition ${props.value === o.v ? 'bg-card shadow' : 'text-mute'}`}
          onClick={() => { tap(); props.onChange(o.v); }}>{o.label}</button>
      ))}
    </div>
  );
}
