# Trade Saathi — Kya bana, kya bacha hai

## Phase 1 ✅ bana
- **PIN lock**: 4–6 digit, PBKDF2 hash D1 mein, 30 din ka secure cookie, 5 galat try → 15 min lock. Sab `/api/*` session ya cron secret maangte hain.
- **Aaj ka haal**: value, lagaya, kul P&L (₹, %), aaj ka change, "Green hone ke liye X% aur chahiye", market open/closed badge (IST), pull-to-refresh, last-updated time, offline banner.
- **Holdings**: jodo/badlo/hatao, symbol autocomplete, live price, aaj %, P&L, short/long-term + din, sparkline, danger level (default −7%, Settings mein badlo). **CSV import** (Groww/Upstox, column-mapping screen, symbol auto-guess).
- **Order Card**: Bechna / Kharidna / Stop-loss / Target — broker screen jaisa field-by-field, copy buttons, Hinglish explanation, checks (SL trigger < price, limit ≤ trigger, ₹0.05 tick, qty ≤ holding), P&L at exit/target. **Kabhi order nahi lagata.**
- **Alerts**: price upar/neeche, % move, khatre ka price, buy levels (MCX 3350/3250/3100), portfolio green, roz 3:35 PM summary. Per-day dedupe (D1). Chhutti list + "aaj candle nahi = chhutti". Telegram wizard (token → Start → auto-detect chat IDs → test). Multiple chat IDs (aap + family).
- **Settings**: PIN badlo, Telegram, danger default, colour-blind safe rang, chhutti list, JSON export/import, Home Screen guide, About / "investment advice nahi".
- **"ye kya hai?"** sheets: trigger, limit, stop-loss, delivery, validity, danger, P&L, avg, STCG/LTCG, GMP, green-%.
- **Quality**: TypeScript strict; 24 unit tests (money, breakeven, order card, alerts + dedupe, CSV, IST); Playwright smoke test 430×932; Lighthouse mobile (PIN screen) Performance 100 / Accessibility 100 / Best Practices 100; JS 26 KB gzip; offline app shell.

## Dhyan dene wali baatein
- Prices Yahoo Finance se (free, unofficial) — late ho sakte hain, kabhi band bhi. App hamesha last-updated time dikhata hai.
- NSE 2026 chhutti list memory se bhari hai — NSE circular se ek baar check karke Settings mein theek karo.
- Screenshots (Telegram wizard) abhi placeholder hain.
- Lighthouse 12 mein alag "PWA" score nahi hota; manifest, icons, service worker, offline shell sab lage hain.

## Bacha hai
- **Phase 2**: Trailing SL helper, Trade Journal + Insights, Risk Guard (F&O, loss limits, breathing lock, checklist, SEBI warning).
- **Phase 3**: IPO corner, Tax helper, Paper-trade lab, Weekly report.

## Free-tier estimate (1–2 log) — ₹0
| Cheez | Free limit | Andaza |
|---|---|---|
| Pages Functions requests | 100,000 / din | ~300–800 / din (app har 60s refresh jab khuli ho + ~28 cron) |
| D1 reads | 5 million / din | ~5–20k / din |
| D1 writes | 100,000 / din | < 100 / din |
| D1 storage | 5 GB | < 5 MB |
| GitHub Actions (private repo) | 2,000 min / mahina | 28 runs/din × 22 din × 1 min (GitHub har job ko 1 min round karta hai) ≈ **~620 min** + CI ~50 min |
| Telegram Bot API | free | ~10–30 msg / din |
| Yahoo chart API | free | 60s edge cache |
