#!/usr/bin/env node
// Usage: node src/cli.js <discover|tailor|apply|run|status|login-naukri> [--auto-submit] [--limit N]
import fs from 'node:fs';
import path from 'node:path';
import * as db from './db.js';
import { profile as loadProfile, companies as loadCompanies } from './config.js';
import * as ats from './sources/ats.js';
import * as naukri from './sources/naukri.js';
import { prefilter } from './filter.js';
import { tailor } from './tailor.js';
import { renderPdf } from './render.js';
import { applyForm } from './apply/forms.js';
import { applyNaukri } from './apply/naukri.js';

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : dflt;
};
const safe = (s) => s.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);

async function discover() {
  const cfg = loadCompanies();
  const prefs = loadProfile().preferences;
  const store = db.load();
  const tasks = [
    ...(cfg.greenhouse ?? []).map((s) => ['greenhouse', s, () => ats.greenhouse(s)]),
    ...(cfg.lever ?? []).map((s) => ['lever', s, () => ats.lever(s)]),
    ...(cfg.ashby ?? []).map((s) => ['ashby', s, () => ats.ashby(s)]),
  ];
  if (cfg.naukri?.queries?.length) tasks.push(['naukri', cfg.naukri.queries.join(', '), () => naukri.search(cfg.naukri)]);

  let added = 0;
  for (const [src, name, fn] of tasks) {
    try {
      const jobs = await fn();
      const relevant = jobs.filter((j) => prefilter(j, prefs));
      for (const j of relevant) if (db.upsert(store, j)) added++;
      console.log(`${src}/${name}: ${jobs.length} jobs, ${relevant.length} relevant`);
    } catch (e) {
      console.warn(`${src}/${name}: ${e.message}`);
    }
  }
  db.save(store);
  console.log(`New jobs: ${added}`);
}

async function tailorAll() {
  const profile = loadProfile();
  const store = db.load();
  const limit = Number(opt('limit', profile.preferences.maxApplicationsPerRun));
  const pending = Object.values(store).filter((j) => j.status === 'new').slice(0, limit);
  for (const job of pending) {
    process.stdout.write(`Tailoring ${job.company} — ${job.title} ... `);
    try {
      const t = await tailor(profile, job);
      const dir = path.resolve('data/applications', safe(`${job.company}_${job.title}_${job.id.split(':').pop()}`));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'tailored.json'), JSON.stringify(t, null, 2));
      fs.writeFileSync(path.join(dir, 'cover-letter.txt'), t.coverLetter);
      const pdf = await renderPdf(t.resume, path.join(dir, `${safe(profile.name)}_Resume.pdf`));
      const pass = t.score >= profile.preferences.minScore;
      db.update(store, job.id, { status: pass ? 'tailored' : 'skipped', score: t.score, reason: t.reason, missingSkills: t.missingSkills, dir, pdf });
      console.log(`${t.score}/100 ${pass ? '✓' : '✗ skipped'} (${t.reason})`);
    } catch (e) {
      db.update(store, job.id, { status: 'failed', note: e.message });
      console.log(`error: ${e.message}`);
    }
    db.save(store);
  }
}

async function applyAll() {
  const profile = loadProfile();
  const store = db.load();
  const autoSubmit = flag('auto-submit');
  const limit = Number(opt('limit', profile.preferences.maxApplicationsPerRun));
  const ready = Object.values(store)
    .filter((j) => j.status === 'tailored')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  for (const job of ready) {
    console.log(`Applying: ${job.company} — ${job.title} (${job.score})`);
    const t = JSON.parse(fs.readFileSync(path.join(job.dir, 'tailored.json'), 'utf8'));
    try {
      const fn = job.apply.type === 'naukri' ? applyNaukri : applyForm;
      const res = await fn(job, t, { resumePdf: job.pdf, profile: { ...profile, ...t.resume }, autoSubmit });
      db.update(store, job.id, { ...res, appliedAt: new Date().toISOString() });
      console.log(`  ${res.status}${res.note ? ` — ${res.note}` : ''}`);
    } catch (e) {
      db.update(store, job.id, { status: 'failed', note: e.message });
      console.log(`  failed — ${e.message}`);
    }
    db.save(store);
  }
}

function status() {
  const jobs = Object.values(db.load());
  const counts = jobs.reduce((m, j) => ((m[j.status] = (m[j.status] ?? 0) + 1), m), {});
  console.log(counts);
  for (const j of jobs.filter((j) => ['tailored', 'manual', 'applied'].includes(j.status)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))) {
    console.log(`${j.status.padEnd(8)} ${String(j.score ?? '-').padStart(3)}  ${j.company} — ${j.title}  ${j.note ?? ''}\n         ${j.url}`);
  }
}

async function loginNaukri() {
  const { browser, context } = await naukri.openNaukri({ headless: false });
  const page = await context.newPage();
  await page.goto('https://www.naukri.com/nlogin/login');
  console.log('Log in to Naukri in the opened browser (OTP etc.), then close the window.');
  await page.waitForEvent('close', { timeout: 0 });
  fs.mkdirSync('.auth', { recursive: true });
  await context.storageState({ path: naukri.NAUKRI_STATE });
  await browser.close();
  console.log(`Saved session to ${naukri.NAUKRI_STATE}`);
}

const commands = {
  discover,
  tailor: tailorAll,
  apply: applyAll,
  status,
  'login-naukri': loginNaukri,
  run: async () => { await discover(); await tailorAll(); await applyAll(); status(); },
};

if (!commands[cmd]) {
  console.log('Commands: discover | tailor [--limit N] | apply [--auto-submit] [--limit N] | run | status | login-naukri');
  process.exit(1);
}
await commands[cmd]();
