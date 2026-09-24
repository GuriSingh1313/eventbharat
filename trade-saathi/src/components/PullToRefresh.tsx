import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { tap } from './ui';

const THRESHOLD = 70;

export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>; children: ComponentChildren }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const down = (e: TouchEvent) => { start.current = window.scrollY <= 0 ? (e.touches[0]?.clientY ?? null) : null; };
    const move = (e: TouchEvent) => {
      if (start.current === null || busy) return;
      const dy = (e.touches[0]?.clientY ?? 0) - start.current;
      setPull(dy > 0 ? Math.min(dy * 0.5, 110) : 0);
    };
    const up = async () => {
      if (start.current === null) return;
      start.current = null;
      if (pull >= THRESHOLD && !busy) {
        tap(); setBusy(true); setPull(50);
        try { await onRefresh(); } finally { setBusy(false); setPull(0); }
      } else setPull(0);
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('touchstart', down); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, [pull, busy, onRefresh]);

  return (
    <div>
      <div class="flex justify-center overflow-hidden transition-[height]" style={{ height: `${pull}px` }} aria-hidden={!busy}>
        <div class={`self-end mb-2 h-6 w-6 rounded-full border-2 border-mute border-t-transparent ${busy ? 'animate-spin' : ''}`}
          style={{ transform: busy ? undefined : `rotate(${pull * 4}deg)`, opacity: Math.min(pull / THRESHOLD, 1) }} />
      </div>
      {children}
    </div>
  );
}
