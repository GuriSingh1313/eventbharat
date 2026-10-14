// Naukri search via a real browser session (uses the login saved by `login-naukri`).
import { chromium } from 'playwright';
import fs from 'node:fs';

export const NAUKRI_STATE = '.auth/naukri.json';

export async function openNaukri({ headless = true } = {}) {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext(
    fs.existsSync(NAUKRI_STATE) ? { storageState: NAUKRI_STATE } : {},
  );
  return { browser, context };
}

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

export async function search({ queries, location, experience, pages = 1 }) {
  const { browser, context } = await openNaukri();
  const page = await context.newPage();
  const jobs = [];
  try {
    for (const q of queries) {
      for (let p = 1; p <= pages; p++) {
        const url = `https://www.naukri.com/${slugify(q)}-jobs-in-${slugify(location)}${p > 1 ? `-${p}` : ''}?experience=${experience}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.srp-jobtuple-wrapper, .cust-job-tuple', { timeout: 15000 }).catch(() => {});
        const found = await page.$$eval('.srp-jobtuple-wrapper, .cust-job-tuple', (cards) =>
          cards.map((c) => {
            const a = c.querySelector('a.title');
            return {
              jobId: c.getAttribute('data-job-id') ?? a?.href,
              title: a?.textContent?.trim(),
              url: a?.href,
              company: c.querySelector('.comp-name')?.textContent?.trim(),
              location: c.querySelector('.locWdth, .loc-wrap')?.textContent?.trim(),
              snippet: c.querySelector('.job-desc')?.textContent?.trim(),
            };
          }),
        );
        for (const j of found.filter((j) => j.url)) {
          jobs.push({
            id: `nk:${j.jobId}`,
            source: 'naukri',
            company: j.company ?? '',
            title: j.title ?? '',
            location: j.location ?? '',
            url: j.url,
            description: j.snippet ?? '',
            apply: { type: 'naukri', url: j.url },
          });
        }
      }
    }
    // Pull full JD for each card (search snippets are too short to tailor against).
    for (const job of jobs) {
      await page.goto(job.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
      const jd = await page
        .$eval('[class*="job-desc"], .dang-inner-html', (el) => el.innerText)
        .catch(() => null);
      if (jd) job.description = jd.replace(/\s+/g, ' ').trim();
      await page.waitForTimeout(1500 + Math.random() * 1500);
    }
  } finally {
    await browser.close();
  }
  return jobs;
}
