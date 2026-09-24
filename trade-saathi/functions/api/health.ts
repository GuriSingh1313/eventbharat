import { json, type Env } from '../_lib/env';
export const onRequestGet: PagesFunction<Env> = async ({ env }) => json({ ok: true, db: !!env.DB });
