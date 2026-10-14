// Fills ATS application forms (Greenhouse / Lever / Ashby) in a real browser.
// Default is review mode: the form is filled and left open for you to check and submit.
// With --auto-submit it clicks Submit itself, but only when no required field is left empty.
import { chromium } from 'playwright';

async function fillFirst(page, selectors, value) {
  if (!value) return false;
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.count() && await el.isVisible().catch(() => false)) {
      await el.fill(String(value));
      return true;
    }
  }
  return false;
}

async function uploadFirst(page, selectors, file) {
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.count()) {
      await el.setInputFiles(file);
      return true;
    }
  }
  return false;
}

async function emptyRequired(page) {
  return page.$$eval('input[required], textarea[required], select[required], [aria-required="true"]', (els) =>
    els.filter((e) => e.type !== 'hidden' && e.type !== 'file' && !e.value).map((e) => e.name || e.id || e.getAttribute('aria-label')),
  );
}

export async function applyForm(job, t, { resumePdf, profile, autoSubmit }) {
  const [first, ...rest] = profile.name.split(' ');
  const url =
    job.apply.type === 'greenhouse'
      ? `https://job-boards.greenhouse.io/${job.apply.board}/jobs/${job.apply.jobId}`
      : job.apply.url;

  const browser = await chromium.launch({ headless: autoSubmit });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (job.apply.type === 'ashby') {
      await page.getByRole('tab', { name: /application/i }).click().catch(() => {});
    }

    await uploadFirst(page, ['input[type=file][name*=resume i]', 'input[type=file]#resume', 'input[type=file]'], resumePdf);
    await page.waitForTimeout(1500); // ATS parsers may autofill from the upload; we overwrite below.

    await fillFirst(page, ['#first_name', 'input[name=first_name]', 'input[name*=firstName i]'], first);
    await fillFirst(page, ['#last_name', 'input[name=last_name]', 'input[name*=lastName i]'], rest.join(' '));
    await fillFirst(page, ['input[name=name]', 'input[name=_systemfield_name]', 'input[aria-label*="full name" i]'], profile.name);
    await fillFirst(page, ['#email', 'input[name=email]', 'input[type=email]'], profile.email);
    await fillFirst(page, ['#phone', 'input[name=phone]', 'input[type=tel]'], profile.phone);
    await fillFirst(page, ['input[name*=linkedin i]', 'input[aria-label*=linkedin i]', 'input[name="urls[LinkedIn]"]'], profile.links?.linkedin);
    await fillFirst(page, ['input[name*=github i]', 'input[name="urls[GitHub]"]'], profile.links?.github);
    await fillFirst(page, ['textarea[name=comments]', 'textarea[name*=cover i]', '#cover_letter_text'], t.coverLetter);

    const missing = await emptyRequired(page);
    if (!autoSubmit) {
      console.log(`  → Review the form in the browser and submit. Unfilled required: ${missing.join(', ') || 'none'}`);
      console.log('  → Close the browser window when done.');
      await page.waitForEvent('close', { timeout: 0 });
      return { status: 'manual', note: 'filled; submitted by user (unverified)' };
    }
    if (missing.length) return { status: 'manual', note: `needs answers: ${missing.join(', ')}` };

    await page.getByRole('button', { name: /submit( application)?/i }).first().click();
    await page.waitForTimeout(5000);
    const ok = await page.getByText(/thank you|application (has been )?(received|submitted)/i).count();
    return ok ? { status: 'applied' } : { status: 'failed', note: 'no confirmation seen' };
  } finally {
    await browser.close().catch(() => {});
  }
}
