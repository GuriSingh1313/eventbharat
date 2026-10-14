// Applies on Naukri with your saved login. Naukri uses your Naukri profile resume, so
// keep that profile current; the tailored PDF is saved locally for company-site applies.
import { openNaukri } from '../sources/naukri.js';

export async function applyNaukri(job, _t, { autoSubmit }) {
  const { browser, context } = await openNaukri({ headless: autoSubmit });
  const page = await context.newPage();
  try {
    await page.goto(job.url, { waitUntil: 'domcontentloaded' });
    if (await page.getByText(/^applied$/i).count()) return { status: 'applied', note: 'already applied' };

    const company = page.getByRole('button', { name: /apply on company site/i });
    if (await company.count()) return { status: 'manual', note: 'redirects to company site' };

    const btn = page.locator('#apply-button, button:has-text("Apply")').first();
    if (!(await btn.count())) return { status: 'failed', note: 'apply button not found (logged in?)' };
    if (!autoSubmit) {
      console.log('  → Naukri page open. Click Apply / answer questions yourself, then close the window.');
      await page.waitForEvent('close', { timeout: 0 });
      return { status: 'manual', note: 'user handled' };
    }
    await btn.click();
    await page.waitForTimeout(4000);
    if (await page.locator('.chatbot_DrawerContentWrapper, [class*="chatbot"]').count()) {
      return { status: 'manual', note: 'recruiter questionnaire needs answers' };
    }
    const ok = await page.getByText(/successfully applied|applied to/i).count();
    return ok ? { status: 'applied' } : { status: 'failed', note: 'no confirmation seen' };
  } finally {
    await browser.close().catch(() => {});
  }
}
