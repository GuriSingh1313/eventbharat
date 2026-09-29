# Client Khoj — LinkedIn / Upwork se client laane ka tool

`https://<aapki-site>/khoj/` — sirf aapke liye (password se band).

## Ye kaise kaam karta hai (ek line mein)

**Post paste karo → ek button → client ke business ka chalta hua demo + ready message → aap copy karke bhejo.**

Baaki freelancers likhte hain "main bana sakta hoon". Aap bhejte ho "maine aapke liye bana diya, 1 minute mein try karo". Isi se reply aate hain.

- **Personal demo:** bakery, salon, clinic, dukaan jaise leads ke liye AI unke naam ka bot demo bana deta hai, sample rates ke saath. Link message mein apne aap jud jaata hai. Koi database nahi, koi setup nahi.
- **Upwork bhi:** Upwork job paste karo to connection note ki jagah proposal milta hai. Source AI khud pehchaan leta hai.
- **Reply coach:** client ka reply paste karo. AI agla message likhta hai aur batata hai aage kya karna hai (call fix karo, price bolo…).
- **Client mila?** "📦 Claude ke liye brief" copy karke Claude ko bhejo. Wo kaam banane mein madad karega.
- **Paise nahi lagane?** "Claude app ke liye copy karo" button se wahi prompt Claude app mein chalao (demo nahi banega).

**Ye tool LinkedIn mein login nahi karta aur khud message nahi bhejta.** LinkedIn bots pakad ke account restrict kar deta hai. Isliye bhejna aap khud karte ho.

## Chalu karo (ek baar)

Vercel → Settings → Environment Variables:

| Naam | Kya daalna hai |
|---|---|
| `LEADS_CODE` | Apna koi password, jaise `guri-khoj-7391`. Iske bina tool nahi khulega |
| `ANTHROPIC_API_KEY` | AI ke liye (DUKAAN.md, section 1). Bina iske "Claude app" wala free button chalega |
| `LEADS_MODEL` | Optional. Default `claude-opus-5`; sasta chahiye to `claude-sonnet-5` |

Redeploy → `/khoj/` kholo → password → Settings mein naam bharo → **🧰 Kit** tab ki checklist follow karo.

## Roz ka kaam (30 minute)

1. **5 min:** 5 business owners ki posts pe achha comment (2-3 line, madad wala).
2. **15 min:** "🔍 Leads kahan milenge?" se 5 post/job dhoondho → paste → **Demo + message banao** → bhejo.
3. **5 min:** Leads → "Aaj ka kaam" → follow-ups.
4. Reply aaye → lead kholo → reply paste → **Jawab likho**.

## 4 rules (account safe rahega)

1. Connection request zyada tar **bina note** ke. Accept hone ke baad demo wala message.
2. Note sirf 🔥 hot lead ke liye (free account mein mahine ke kuch hi note, 200 character).
3. Roz 15-20 se zyada request nahi. Hafte mein ~100 ki limit hai.
4. Koi bot / extension nahi.

## Kharcha

Andaza (Opus 5): ek lead ≈ ₹4-5 (demo profile ki wajah se thoda zyada), reply coach ≈ ₹2. Demo pe client chat kare to har jawab ≈ ₹1.5 (Dukaan Saathi wala hisaab). `LEADS_MODEL` / `DUKAAN_MODEL` = `claude-sonnet-5` se lagbhag aadhe se kam. Asli kharcha Anthropic Console → Usage mein dekho.

## Data kahan hai?

Leads **sirf aapke phone ke browser mein**. Server kuch save nahi karta. Phone badalne se pehle **Settings → Backup download**.

### Developer notes

| File | Kaam |
|---|---|
| `khoj/` | React app (`/khoj/`) |
| `khoj/lib/prompt.js` | Saare prompts (server + browser dono use karte hain), `applyDemoLink`, project brief |
| `khoj/lib/demo.js` | AI ke demo profile → Dukaan Saathi profile |
| `khoj/lib/leads.js` | Statuses, follow-up, "aaj ka kaam", conversation thread |
| `khoj/lib/search.js` | LinkedIn / Upwork / Google search links |
| `khoj/lib/kit.js` | Profile Kit text, checklist, rules |
| `api/lead-draft.js` | Vercel function (password check, draft + reply modes) |
| `api/_leads/draft.js` | Structured output schemas, `draftLead()`, `replyLead()` |
