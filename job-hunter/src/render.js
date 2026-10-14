// Renders a tailored resume JSON to an ATS-friendly single-column PDF.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const list = (items = []) => `<ul>${items.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;

export function resumeHtml(r) {
  const links = Object.values(r.links ?? {}).map(esc).join(' · ');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#111;margin:0;line-height:1.35}
h1{font-size:18pt;margin:0}h2{font-size:11pt;text-transform:uppercase;border-bottom:1px solid #999;margin:12px 0 4px}
.c{color:#444;font-size:9.5pt}.row{display:flex;justify-content:space-between}ul{margin:2px 0 6px 18px;padding:0}li{margin:1px 0}
</style></head><body>
<h1>${esc(r.name)}</h1>
<div class="c">${esc(r.email)} · ${esc(r.phone)} · ${esc(r.location ?? '')}<br>${links}</div>
<h2>Summary</h2><div>${esc(r.summary)}</div>
<h2>Skills</h2><div>${(r.skills ?? []).map(esc).join(', ')}</div>
<h2>Experience</h2>${(r.experience ?? []).map((e) => `
<div class="row"><b>${esc(e.title)} — ${esc(e.company)}</b><span class="c">${esc(e.start)} – ${esc(e.end)}</span></div>${list(e.bullets)}`).join('')}
${r.projects?.length ? `<h2>Projects</h2>${r.projects.map((p) => `<b>${esc(p.name)}</b>${list(p.bullets)}`).join('')}` : ''}
<h2>Education</h2>${(r.education ?? []).map((e) => `<div class="row"><span>${esc(e.degree)}, ${esc(e.school)}</span><span class="c">${esc(e.year)}</span></div>`).join('')}
</body></html>`;
}

export async function renderPdf(resume, outFile) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(resumeHtml(resume));
    await page.pdf({ path: outFile, format: 'A4', margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' } });
  } finally {
    await browser.close();
  }
  return outFile;
}
