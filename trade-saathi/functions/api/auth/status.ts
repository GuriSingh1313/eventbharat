import { hasValidSession, pinIsSet } from '../../_lib/auth';
import { json, type Env } from '../../_lib/env';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  json({ pinSet: await pinIsSet(env.DB), loggedIn: await hasValidSession(request, env.DB) });
