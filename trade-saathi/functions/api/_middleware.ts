import { hasValidSession } from '../_lib/auth';
import { bad, safeEqual, type Env } from '../_lib/env';

const PUBLIC = new Set(['/api/auth/status', '/api/auth/setup', '/api/auth/login', '/api/health']);

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { pathname } = new URL(ctx.request.url);
  try {
    if (PUBLIC.has(pathname)) return await ctx.next();
    const secret = ctx.request.headers.get('x-cron-secret');
    if (secret && ctx.env.CRON_SECRET && safeEqual(secret, ctx.env.CRON_SECRET)) return await ctx.next();
    if (pathname === '/api/alerts/run') return bad('forbidden', 403);
    if (!(await hasValidSession(ctx.request, ctx.env.DB))) return bad('login chahiye', 401);
    // CSRF: state-changing requests must come from our own origin.
    if (ctx.request.method !== 'GET') {
      const origin = ctx.request.headers.get('origin');
      if (origin && origin !== new URL(ctx.request.url).origin) return bad('bad origin', 403);
    }
    return await ctx.next();
  } catch (e) {
    return bad(`server error: ${(e as Error).message}`, 500);
  }
};
