# Client Khoj — LinkedIn pe client dhoondhne ka assistant

`https://<aapki-site>/khoj/` — sirf aapke liye (access code se band).

**Ye tool LinkedIn mein login nahi karta, profile nahi badalta, aur khud message nahi bhejta.** LinkedIn apne rules mein bots aur automation mana karta hai aur aise accounts ko restrict/ban karta hai. Isliye bhejne ka kaam aap khud karte ho. Baaki sab ye karta hai:

1. **Dhoondho:** ek tap mein LinkedIn search khulti hai ("looking for a developer", "need a chatbot"… pichhle 24 ghante / hafte ki posts, ya aapke shehar ke business owners).
2. **Check + likho:** kaam ki post ka text copy karke paste karo. AI batata hai 🔥 hot / 🙂 warm / 🧊 cold, aur us insaan ke liye connection note, message, comment aur follow-up likhta hai. Aap edit kar sakte ho.
3. **Bhejo:** 📋 Copy → LinkedIn pe paste → bhejo → "✅ Bhej diya". Ek message mein ~10 second.
4. **Yaad dilana:** 3 din tak reply nahi aaya to lead "⏰ Follow-up" mein aa jaati hai (maximum 2 follow-up). Roz ka target aur "aaj kitne bheje" upar dikhta hai.

## Chalu karo

Vercel → Settings → Environment Variables:

| Naam | Kya daalna hai |
|---|---|
| `ANTHROPIC_API_KEY` | Wahi key jo Dukaan Saathi mein hai (DUKAAN.md, section 1) |
| `LEADS_CODE` | Apna koi lamba password, jaise `guri-khoj-7391`. Iske bina tool nahi khulega |
| `LEADS_MODEL` | Optional. Default `claude-opus-5`; sasta chahiye to `claude-sonnet-5` |

Redeploy karo → `/khoj/` kholo → code daalo → **Settings** mein apna naam aur "main kya kaam karta hoon" bharo.

## Roz ka routine (30-40 minute)

1. **Dhoondho** tab → "24 ghante" → 3-4 search buttons kholo.
2. Jo post sach mein kisi ko developer/bot/website chahiye wali ho, uska text + link paste karo → 🤖 Check.
3. 🔥 Hot: pehle post pe **comment** (public, madad wala), phir **connection note** ke saath request bhejo.
4. **Leads** tab → "Aaj ka kaam" → follow-ups bhejo.
5. Reply aaye to status "💬 Reply aaya" / "📞 Call" karo, notes likho.

**Kitne bhejein?** Roz 10-20 soch-samajh ke bheje hue message, 100 copy-paste walon se behtar hain. LinkedIn bahut zyada connection requests ya ek jaise message pe account limit kar deta hai. Har message thoda badal ke bhejo (AI pehle se har insaan ke liye alag likhta hai).

## Kharcha

Andaza: ek lead check + drafts ≈ ₹3-4 (Opus 5), yaani roz 20 lead ≈ ₹70 (~₹2,000/mahina). `LEADS_MODEL=claude-sonnet-5` se ≈ ₹1.5 per lead. Asli kharcha Anthropic Console → Usage mein dekho.

## Data kahan hai?

Leads aur aapki details **sirf aapke phone ke browser mein** save hain. Server kuch save nahi karta, sirf AI se draft likhwata hai. Phone badalne ya browser data saaf karne se pehle **Settings → Backup download** kar lo.

### Developer notes

| File | Kaam |
|---|---|
| `khoj/` | React app (`/khoj/`) |
| `khoj/lib/search.js` | LinkedIn / Google search links |
| `khoj/lib/leads.js` | Lead statuses, follow-up aur "aaj ka kaam" logic |
| `api/lead-draft.js` | Vercel function (access code check, AI call) |
| `api/_leads/draft.js` | Prompt, structured output schema, `draftLead()` |
