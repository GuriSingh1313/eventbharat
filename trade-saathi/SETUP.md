# Trade Saathi — Setup Guide (sirf iPhone + Safari se) 📱

Total time: lagbhag **30–40 minute**, sirf ek baar. Sab kuch **free** hai, credit card nahi chahiye.
Har step mein ek hi kaam hai. ✅ = "ye dikhna chahiye".

> Tip: Safari mein websites ko "Desktop version" mein kholna ho toh address bar ke left **"aA"** dabao → **Request Desktop Website**. Cloudflare ke kuch pages desktop view mein aasaan lagte hain.

---

## Part A — GitHub check (2 min)

1. Safari mein **github.com** kholo aur login karo.
2. Apni repo **eventbharat** kholo.
   ✅ Repo naam ke paas **"Private"** likha hona chahiye.
3. Agar "Public" likha hai: **Settings → General → neeche "Danger Zone" → Change visibility → Make private**.
   ✅ Ab "Private" dikhega. (Ye zaroori hai — aapka data aur code sirf aapka.)
4. Trade Saathi ka code abhi branch **`claude/trade-saathi-mobile-payz8e`** par hai. Ise **main** mein merge karna hai: repo mein **Pull requests** → us branch ka PR kholo → **Merge pull request** → **Confirm**.
   ✅ Repo ke main page par **`trade-saathi`** folder dikhega.

---

## Part B — Cloudflare account (3 min)

5. **dash.cloudflare.com/sign-up** kholo.
6. Email + password daalo → **Sign up**.
7. Email mein aaya link dabakar verify karo.
   ✅ Cloudflare Dashboard khul jayega. (Koi "plan" ya card nahi maangega — agar maange toh **Free** chuno.)

---

## Part C — Database (D1) banao (5 min)

8. Dashboard mein left menu (☰) → **Storage & Databases → D1 SQL Database**.
9. **Create** dabao.
10. Name mein likho: `trade_saathi` → **Create**.
    ✅ Naya database khulega.
11. Upar **Console** tab dabao.
12. Ek naye Safari tab mein GitHub par ye file kholo: `trade-saathi/seed/setup-all.sql` → upar-right **Raw** dabao → poora text select karke **Copy**.
13. Cloudflare Console wale box mein **Paste** karo → **Execute** dabao.
    ✅ Green success message aayega. **Tables** tab mein `holdings`, `alerts`, `journal` dikhenge.
    (Isme aapke 5 stocks, danger levels, MCX buy levels aur NSE IPO wali entry pehle se bhari hai.)

---

## Part D — App ko Cloudflare Pages pe daalo (10 min)

14. Left menu → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
15. **GitHub** chuno → **Connect GitHub** → GitHub login → "Only select repositories" → **eventbharat** chuno → **Install & Authorize**.
    ✅ Wapas Cloudflare mein repo list mein `eventbharat` dikhega.
16. **eventbharat** chuno → **Begin setup**.
17. Ye bharo (bilkul aise hi):
    - Project name: `trade-saathi`
    - Production branch: `main`
    - Framework preset: **None**
    - Build command: `npm run build`
    - Build output directory: `dist`
    - **Root directory (advanced)** kholo → Path: `trade-saathi`
    - **Environment variables** → Add: Name `NODE_VERSION`, Value `22`
18. **Save and Deploy** dabao.
    ✅ 1–2 minute baad "Success!" aur ek link milega jaise **`https://trade-saathi.pages.dev`**. Ise Notes mein save kar lo — ye aapka **App URL** hai.

19. Ab database jodna hai: project mein **Settings → Bindings → Add → D1 database**.
    - Variable name: `DB`
    - D1 database: `trade_saathi`
    → **Save**.
20. Ek secret password banao alerts ke liye: iPhone **Passwords** app → **+** → "Create strong password" wala password copy karo (ya 30+ random letters/numbers khud likho). Isse **CRON_SECRET** bolenge. Notes mein save karo.
21. **Settings → Variables and Secrets → Add**:
    - Type: **Secret**, Name: `CRON_SECRET`, Value: step 20 wala password → **Save**.
22. Settings apply karne ke liye: **Deployments** tab → sabse upar wali deployment ke **⋯** → **Retry deployment**.
    ✅ Nayi deployment "Success" dikhegi.

---

## Part E — App kholo aur Home Screen pe lagao (3 min)

23. Safari mein apna **App URL** kholo.
    ✅ "Apna PIN banao" screen aayegi.
24. 4–6 number ka PIN daalo → **Aage** → dobara wahi PIN → **Kholo**.
    ✅ "Aaj ka haal" screen aapke stocks ke saath.
25. Safari mein neeche **Share (⬆️)** → **Add to Home Screen** → **Add**.
    ✅ Home Screen par green "Trade Saathi" icon. Ab isi se kholna — app jaisa full-screen khulega.

---

## Part F — Telegram alerts (5 min) — app ke andar hi

26. App mein **Alerts** tab → **✈️ Telegram setup** dabao. Wahan 4 step ka guide hai:
    1. Telegram mein **@BotFather** (blue tick) → **Start** → `/newbot` → naam → username (end mein `bot`).
    2. BotFather ka diya **token** copy karke app mein paste → **Aage**.
    3. BotFather ke message mein aapke bot ka link (t.me/...) kholo → **Start**. Family member ko bhi yahi link bhejo, woh bhi **Start** dabaye.
    4. **Chat dhoondho** → naam pe tick → **Save + Test message bhejo**.
    ✅ Telegram par "✅ Trade Saathi se test message!" aayega.

---

## Part G — Automatic alerts chalu karo (GitHub Actions) (5 min)

27. GitHub par repo → **Settings → Secrets and variables → Actions → New repository secret**.
28. Name: `TS_APP_URL`, Secret: apna App URL (jaise `https://trade-saathi.pages.dev`, end mein `/` nahi) → **Add secret**.
29. Phir se **New repository secret** → Name: `TS_CRON_SECRET`, Secret: step 20 wala wahi password → **Add secret**.
30. Repo → **Actions** tab. Agar "Workflows aren't being run" dikhe toh **I understand… enable them** dabao.
31. Left mein **Trade Saathi alerts** → **Run workflow** → **Run workflow**.
    ✅ 30 second mein green ✓. (Market band ho toh output mein "market band" / "weekend" likha aayega — ye bhi sahi hai.)

Ab se Mon–Fri har 15 minute (9:15 AM – 3:35 PM) alerts check honge, aur roz ~3:35 PM ko din ka summary Telegram pe aayega. 🎉

---

## Troubleshooting 🛠️

| Problem | Kya karein |
|---|---|
| Deploy fail: "npm ERR" / build failed | Step 17 check karo: Root directory `trade-saathi` aur `NODE_VERSION = 22`. Phir Retry deployment. |
| App khuli par "server error: … DB" ya "login chahiye" baar-baar | Step 19 ka D1 binding (`DB`) check karo, phir Step 22 (Retry deployment). |
| "no such table" error | Step 11–13 dobara karo (setup-all.sql Execute). |
| PIN bhool gayi | D1 → Console mein ye chalao: `DELETE FROM settings WHERE key='pin_hash'; DELETE FROM sessions;` → app kholo, naya PIN banao. Data safe rahega. |
| "Bahut galat try" lock | 15 minute ruko. |
| Prices nahi aa rahe / "Data thoda late hai" | Yahoo kabhi-kabhi slow hota hai. 1–2 minute baad neeche kheech ke refresh karo. Symbol sahi hai? (NSE symbol, jaise `INFY`, `TCS`). |
| Telegram test message nahi aaya | Bot ke chat mein **Start** dabaya? Phir "Chat dhoondho" dobara. Token galat ho toh BotFather → `/mybots` → bot → **API Token**. |
| GitHub Action red ✗ "Secrets missing" | Step 28–29 dobara, naam exactly `TS_APP_URL` aur `TS_CRON_SECRET`. |
| GitHub Action red ✗ with 403 | Cloudflare ka `CRON_SECRET` aur GitHub ka `TS_CRON_SECRET` bilkul same hone chahiye. Badla ho toh Step 22 (Retry deployment). |
| Alerts time pe nahi aaye | GitHub free cron kabhi 5–15 min late chalta hai. Ye normal hai. |
| Chhutti wale din alert aaya | App → Settings → **Market chhutti ki list** mein date jodo. |

---

## Local development (sirf developer ke liye, iPhone ki zaroorat nahi)

```bash
cd trade-saathi
npm install
npm run db:migrate:local && npm run db:seed:local
npm run build && npm run pages:dev   # http://localhost:8788
npm test                             # unit tests (money maths, order card, alerts dedupe, CSV)
npx playwright test                  # iPhone-size smoke test (430×932)
```
`.dev.vars` file mein `CRON_SECRET=kuch-bhi` rakho.
