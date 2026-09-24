import { t } from '../lib/strings';
import { Sheet } from './ui';

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t('install.title')}>
      <ol class="space-y-4 mb-5">
        {(['s1', 's2', 's3'] as const).map((k, i) => (
          <li key={k} class="flex gap-3 items-start">
            <span class="shrink-0 h-8 w-8 rounded-full bg-accent text-white font-bold flex items-center justify-center">{i + 1}</span>
            <span class="text-[17px] pt-1">{t(`install.${k}`)}</span>
          </li>
        ))}
      </ol>
      <button class="btn-primary w-full" onClick={onClose}>{t('install.ok')}</button>
    </Sheet>
  );
}
