import { json, type Env } from '../../_lib/env';
import { runAlerts } from '../../_lib/engine';

// Called by GitHub Actions (x-cron-secret) or from the app ("abhi check karo").
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const u = new URL(request.url);
  const res = await runAlerts(env, new Date(), { force: u.searchParams.get('force') === '1', dry: u.searchParams.get('dry') === '1' });
  return json(res);
};
