import { useEffect, useRef, useState } from 'preact/hooks';
import { get } from '../api';
import { t } from '../lib/strings';

interface Hit { symbol: string; exchange: string; name: string }

export function SymbolSearch(props: { value: string; onPick: (h: Hit) => void; onInput?: (v: string) => void; id?: string }) {
  const [q, setQ] = useState(props.value);
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setQ(props.value), [props.value]);

  function onInput(v: string) {
    setQ(v);
    props.onInput?.(v.toUpperCase().trim());
    clearTimeout(timer.current);
    if (v.trim().length < 2) { setHits([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await get<{ results: Hit[] }>(`/api/search?q=${encodeURIComponent(v.trim())}`);
        setHits(r.data.results);
        setOpen(true);
      } catch { setHits([]); }
    }, 300);
  }

  return (
    <div class="relative">
      <input id={props.id} value={q} placeholder={t('holdings.symbolHint')} autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck={false}
        onInput={(e) => onInput(e.currentTarget.value)} onFocus={() => hits.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        role="combobox" aria-expanded={open} aria-autocomplete="list" />
      {open && hits.length > 0 && (
        <ul role="listbox" class="absolute z-20 left-0 right-0 mt-1 card shadow-xl border border-line max-h-64 overflow-y-auto">
          {hits.map((h) => (
            <li key={h.symbol} role="option" aria-selected="false">
              <button type="button" class="w-full text-left px-3 py-2 border-b border-line last:border-0 pressable"
                onClick={() => { setQ(h.symbol); setOpen(false); props.onPick(h); }}>
                <span class="font-semibold">{h.symbol}</span> <span class="text-xs text-mute">{h.exchange}</span>
                <span class="block text-sm text-mute truncate">{h.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
