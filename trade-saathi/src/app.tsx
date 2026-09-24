import { useEffect, useState } from 'preact/hooks';
import { get, setUnauthorizedHandler } from './api';
import { InstallGuide, isStandalone } from './components/InstallGuide';
import { tap, Toaster } from './components/ui';
import { t } from './lib/strings';
import { Alerts } from './screens/Alerts';
import { Holdings } from './screens/Holdings';
import { Home } from './screens/Home';
import { OrderCardScreen } from './screens/OrderCard';
import { PinScreen } from './screens/Pin';
import { applyCb, getCb, Settings } from './screens/Settings';
import { DataProvider } from './store';

type Tab = 'home' | 'holdings' | 'order' | 'alerts' | 'settings';
const TABS: Array<{ id: Tab; icon: string }> = [
  { id: 'home', icon: '🏠' }, { id: 'holdings', icon: '💼' }, { id: 'order', icon: '📋' }, { id: 'alerts', icon: '🔔' }, { id: 'settings', icon: '⚙️' },
];

type Auth = 'loading' | 'setup' | 'login' | 'in' | 'offline';

export function App() {
  const [auth, setAuth] = useState<Auth>('loading');
  const [tab, setTab] = useState<Tab>(() => { try { return (sessionStorage.getItem('ts:tab') as Tab) || 'home'; } catch { return 'home'; } });
  const [install, setInstall] = useState(false);

  async function check() {
    try {
      const r = await get<{ pinSet: boolean; loggedIn: boolean }>('/api/auth/status');
      setAuth(r.offline ? (r.data.loggedIn ? 'in' : 'offline') : !r.data.pinSet ? 'setup' : r.data.loggedIn ? 'in' : 'login');
    } catch { setAuth('offline'); }
  }

  useEffect(() => {
    applyCb(getCb());
    setUnauthorizedHandler(() => setAuth('login'));
    void check();
  }, []);

  useEffect(() => {
    if (auth !== 'in' || isStandalone()) return;
    try { if (!localStorage.getItem('ts:installSeen')) { setInstall(true); localStorage.setItem('ts:installSeen', '1'); } } catch { /* ignore */ }
  }, [auth]);

  const choose = (id: Tab) => { tap(); setTab(id); window.scrollTo({ top: 0 }); try { sessionStorage.setItem('ts:tab', id); } catch { /* ignore */ } };

  if (auth === 'loading') return <div class="min-h-[100dvh] flex items-center justify-center text-mute">{t('common.loading')}</div>;
  if (auth === 'offline') return (
    <main class="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center gap-4">
      <p class="text-lg">📡 {t('common.offline')}</p>
      <button class="btn-primary" onClick={check}>{t('common.retry')}</button>
    </main>
  );
  if (auth === 'setup' || auth === 'login') return <PinScreen mode={auth} onDone={() => setAuth('in')} />;

  return (
    <DataProvider>
      <Toaster />
      <main class="mx-auto max-w-[560px] px-4 safe-top" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
        {tab === 'home' && <Home go={choose} />}
        {tab === 'holdings' && <Holdings />}
        {tab === 'order' && <OrderCardScreen />}
        {tab === 'alerts' && <Alerts />}
        {tab === 'settings' && <Settings onLogout={() => setAuth('login')} />}
      </main>
      <nav class="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-line safe-bottom" aria-label="Main">
        <ul class="mx-auto max-w-[560px] grid grid-cols-5">
          {TABS.map(({ id, icon }) => (
            <li key={id}>
              <button class={`w-full flex flex-col items-center pt-2 pb-1 text-[11px] font-medium ${tab === id ? 'text-accent' : 'text-mute'}`}
                aria-current={tab === id ? 'page' : undefined} onClick={() => choose(id)}>
                <span class={`text-[22px] leading-none ${tab === id ? 'animate-pop' : 'grayscale opacity-70'}`} aria-hidden="true">{icon}</span>
                <span class="mt-1">{t(`tabs.${id}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <InstallGuide open={install} onClose={() => setInstall(false)} />
    </DataProvider>
  );
}
