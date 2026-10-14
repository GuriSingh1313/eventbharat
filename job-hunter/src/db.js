// Tiny JSON-file tracker: every job moves through
// new -> scored -> tailored -> applied | skipped | failed | manual
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('data/jobs.json');

export function load() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

export function save(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export function upsert(db, job) {
  const prev = db[job.id];
  db[job.id] = prev ? { ...job, ...prev } : { ...job, status: 'new', firstSeen: new Date().toISOString() };
  return !prev;
}

export function update(db, id, patch) {
  db[id] = { ...db[id], ...patch, updatedAt: new Date().toISOString() };
}
