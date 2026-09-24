// Combines schema + seed + holidays into one file to paste into the Cloudflare D1 console.
import { readFileSync, writeFileSync } from 'node:fs';
const parts = ['migrations/0001_init.sql', 'seed/seed.sql', 'seed/holidays-2026.sql'];
const sql = parts.map((p) => `-- ===== ${p} =====\n` + readFileSync(p, 'utf8')).join('\n');
writeFileSync('seed/setup-all.sql', `-- Cloudflare D1 Console mein poora paste karke Execute dabao. (Auto-generated: node scripts/build-setup-sql.mjs)\n${sql}`);
