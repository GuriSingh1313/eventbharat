import { expect, test, type Page } from '@playwright/test';

const PIN = '1234';
const QUOTES: Record<string, { ltp: number; prevClose: number }> = {
  NMDCSTEEL: { ltp: 44, prevClose: 43 }, LUPIN: { ltp: 2000, prevClose: 2010 }, HEG: { ltp: 250, prevClose: 240 },
  INFY: { ltp: 1500, prevClose: 1490 }, TCS: { ltp: 3000, prevClose: 3020 }, MCX: { ltp: 3400, prevClose: 3380 },
};

// Yahoo isn't reachable from CI sandboxes — mock the quotes endpoint with realistic data.
async function mockQuotes(page: Page) {
  await page.route('**/api/quotes?*', async (route) => {
    const syms = (new URL(route.request().url()).searchParams.get('symbols') ?? '').split(',');
    const quotes = Object.fromEntries(syms.filter((s) => QUOTES[s]).map((s) => [s, { symbol: s, exchange: 'NSE', ...QUOTES[s], time: Date.now(), spark: [1, 3, 2, 4, 3, 5] }]));
    await route.fulfill({ json: { quotes, fetchedAt: Date.now(), missing: [] } });
  });
}

async function enterPin(page: Page) {
  for (const d of PIN) await page.getByRole('button', { name: d, exact: true }).click();
}

async function login(page: Page) {
  await mockQuotes(page);
  await page.goto('/');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  const text = await heading.textContent();
  if (text?.includes('banao')) {
    await enterPin(page); await page.getByRole('button', { name: 'Aage' }).click();
    await enterPin(page); await page.getByRole('button', { name: 'Kholo' }).click();
  } else if (text?.includes('PIN daalo')) {
    await enterPin(page); await page.getByRole('button', { name: 'Kholo' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Aaj ka haal' })).toBeVisible();
  const close = page.getByRole('button', { name: 'Samajh gayi' });
  if (await close.isVisible().catch(() => false)) await close.click();
}

test('home shows portfolio totals in Indian format', async ({ page }) => {
  await login(page);
  // Seed: invested ₹2,59,063.46; value with mocked prices = 59*44 + 67*2000 + 93*250 + 25*1500 + 21*3000 = 2,60,346
  await expect(page.getByText('₹2,60,346.00')).toBeVisible();
  await expect(page.getByText('₹2,59,063.46')).toBeVisible();
  await expect(page.getByText(/Portfolio green hai/)).toBeVisible();
  await page.screenshot({ path: 'test-results/home.png', fullPage: true });
});

test('holdings list, explain sheet, order card validation', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Holdings' }).or(page.getByRole('button', { name: 'Holdings' })).first().click();
  await expect(page.getByText('LUPIN').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/holdings.png', fullPage: true });

  await page.getByRole('button', { name: 'Order Card' }).click();
  await page.getByRole('button', { name: 'LUPIN', exact: true }).click();
  await page.getByRole('button', { name: 'Stop-loss lagana' }).click();
  // Default trigger comes from LUPIN danger level 1960.
  await expect(page.getByRole('textbox', { name: 'Trigger price' })).toHaveValue('1960');
  await expect(page.getByText(/1,960.00 tak gira/)).toBeVisible();
  // Trigger above LTP must be rejected.
  const trig = page.getByRole('textbox', { name: 'Trigger price' });
  await trig.fill('2050');
  await expect(page.getByText(/trigger abhi ke price/)).toBeVisible();
  await page.screenshot({ path: 'test-results/order.png', fullPage: true });

  // "ye kya hai?" sheet
  await page.getByRole('button', { name: /Trigger price: ye kya hai/ }).click();
  await expect(page.getByRole('dialog', { name: 'Trigger price' })).toBeVisible();
});

test('alerts screen lists seeded MCX buy levels', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Alerts' }).click();
  await expect(page.getByText('Part 2 of 3')).toBeVisible();
  await page.screenshot({ path: 'test-results/alerts.png', fullPage: true });
});
