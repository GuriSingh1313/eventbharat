# Dukaan Saathi — chhoti dukaan ka AI assistant

Dukaan, dhaba, salon, clinic ya coaching ke liye AI chat bot. Customer link kholta hai, sawal poochta hai (rate, timing, menu, delivery), aur bot **order ya appointment leke dukaan wale ke Telegram pe bhej deta hai**. Bot Hinglish, Hindi, English ya Punjabi mein baat karta hai, aur sirf wahi batata hai jo dukaan wale ne likha hai.

Isko do tarah use karte hain:

| | Link | Kiske liye |
|---|---|---|
| **Demo** | `https://<aapki-site>/dukaan/` | Aap. Kisi bhi dukaan ki details bharo, bot try karo, aur link WhatsApp pe dukaan wale ko bhejo. |
| **Pakka link** | `https://<aapki-site>/dukaan/?shop=<id>` | Paying client ke customers. Details server pe fix rehti hain, customer badal nahi sakta. |

---

## 1. Chalu karo (10 minute, phone se ho jaata hai)

**A. Anthropic API key**
1. [platform.claude.com](https://platform.claude.com) pe account banao.
2. **Billing** mein credits daalo (shuru mein $5 kaafi hai).
3. **Limits** mein monthly spend limit lagao (jaise $10). Isse galti ya misuse se bada bill nahi aayega.
4. **API keys** → **Create key** → key copy karo (`sk-ant-...`).

**B. Vercel mein daalo**
1. Vercel → EventBharat project → **Settings → Environment Variables**.
2. Naam `ANTHROPIC_API_KEY`, value wo key → **Save**.
3. **Deployments** → sabse upar wala → **⋯ → Redeploy**.
4. `https://<aapki-site>/dukaan/` kholo aur "Menu dikhao" dabao. Jawab aa gaya to bot chal raha hai ✅

## 2. Orders Telegram pe (optional, par client ko yahi pasand aata hai)

1. Telegram mein **@BotFather** → `/newbot` → naam do → **token** milega.
2. Apne naye bot ko Telegram mein kholo aur **Start** dabao.
3. Browser mein kholo: `https://api.telegram.org/bot<TOKEN>/getUpdates`. Wahan `"chat":{"id":123456789` wala number aapka **chat ID** hai.
4. Vercel env mein daalo:
   - `DUKAAN_TELEGRAM_TOKEN` = token
   - `DUKAAN_OWNER_CHAT_ID` = chat ID (ek se zyada ho to comma se: `111,222`)
5. Redeploy karo. Ab demo mein order karoge to aapke phone pe "🧪 DEMO · 🛎️ Naya order" aayega.

Paying client ke orders uske apne Telegram pe bhejne ke liye uska chat ID `api/_dukaan/shops.js` mein `telegramChatIds` mein daalo (neeche dekho).

## 3. Demo se paise tak

1. **Dukaan chuno.** Aas-paas ki koi dukaan jo WhatsApp pe order leti hai, ya jiske phone pe din bhar "rate kya hai?" wale call aate hain.
2. **Unki details bharo.** `/dukaan/` → **Setup** → sample chuno → naam, timing, phone, menu/rate list, delivery aur payment ke rules. Details unke Google Maps listing, menu card ya Instagram se mil jaayengi.
3. **Khud test karo.** Chat mein customer ban ke 5-6 sawal poocho aur ek order karo. Kuch galat bole to Setup mein "Baaki jaankari" wali jagah saaf likh do.
4. **Bhejo.** Setup → **🟢 WhatsApp pe bhejo**. Message aur link apne aap ban jaate hain. Link mein saari details hoti hain, isliye koi database nahi chahiye.
5. **Haan bole to pakka link banao** (section 4) aur unko do. Customers tak link pahunchane ke liye:
   - QR code bana ke counter pe lagao (koi bhi free QR generator)
   - Instagram bio aur Google Business profile mein link
   - WhatsApp Business ke auto-reply mein link

**Kitna charge karein?** (sirf ek sujhaav) Setup ₹2,000–5,000 ek baar, phir ₹500–1,500 har mahine. Mahine wale paise mein AI ka kharcha (section 5) aa jaana chahiye, uske baad jo bachega wo aapka profit hai. Pehle 2-3 clients ko sasta ya free do, taaki aapke paas dikhane ke liye asli example ho.

## 4. Paying client ka pakka link

1. Demo mein client ki details final karo → Setup → **Advanced → 📋 Profile copy karo**.
2. GitHub mein `api/_dukaan/shops.js` kholo aur ek entry jodo:
   ```js
   'gupta-store': {
     profile: { /* yahan copy kiya hua profile paste karo */ },
     telegramChatIds: ['123456789'], // client ka Telegram chat ID
   },
   ```
3. Commit karo. Vercel apne aap deploy kar dega.
4. Client ka link: `https://<aapki-site>/dukaan/?shop=gupta-store`

Is link pe Setup aur Orders tab nahi dikhte, sirf chat dikhta hai. Rate ya menu badalna ho to `shops.js` mein badlo aur commit karo.

## 5. Kharcha

Default model **Claude Opus 5** hai, jo sabse samajhdar hai. Ek jawab mein lagbhag 2,000 token jaate hain aur 250 aate hain. Neeche ka hisaab andaza hai ($1 ≈ ₹88). Asli kharcha Anthropic Console → Usage mein dekho.

| Model (`DUKAAN_MODEL`) | Ek jawab | Ek customer (≈6 jawab) | 20 customer/din, 1 mahina |
|---|---|---|---|
| `claude-opus-5` (default) | ≈ ₹1.5 | ≈ ₹9 | ≈ ₹5,000 |
| `claude-sonnet-5` | ≈ ₹0.6 | ≈ ₹4 | ≈ ₹2,200 |
| `claude-haiku-4-5` | ≈ ₹0.3 | ≈ ₹2 | ≈ ₹1,100 |

Order wale jawab mein ek extra AI call lagti hai. Chhoti dukaan ke budget ke liye Vercel env mein `DUKAAN_MODEL=claude-sonnet-5` ya `claude-haiku-4-5` lagao aur redeploy karo. Pehle 10-15 sawal poochh ke dekh lo ki jawab theek aa rahe hain.

## 6. Saari settings (Vercel env)

| Naam | Zaroori? | Kaam |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | AI ki key |
| `DUKAAN_MODEL` | — | Model badalna ho (upar table) |
| `DUKAAN_TELEGRAM_TOKEN` | — | Order alert bhejne wala Telegram bot |
| `DUKAAN_OWNER_CHAT_ID` | — | Demo orders kis Telegram pe jaayein |
| `DUKAAN_DEMO_CODE` | — | Lagaoge to demo mein chat karne ke liye ye code chahiye hoga (Setup → Advanced). WhatsApp wale demo link mein ye apne aap jud jaata hai. Isse anjaan log aapki key pe free mein chat nahi kar paayenge. |

Env badalne ke baad hamesha **Redeploy** karo.

## 7. Dhyan rakhna

- **Bot galat bhi bol sakta hai.** Client ko pehle hi bata do. Bot ko sirf dukaan wale ki likhi details se jawab dene ko kaha gaya hai. Jo nahi likha, uske liye wo dukaan ka phone number deta hai. Phir bhi har naye client ke saath 10-15 sawal poochh ke check karo.
- **Payment bot nahi leta.** Wo sirf order note karke owner ko bhejta hai. Owner call karke confirm kare.
- **Clinic:** bot bimari nahi batata aur dawai nahi sujhata, sirf appointment leta hai. Emergency mein 112 bolta hai.
- **Spend limit zaroor lagao** (section 1). Server ek IP se 1 minute mein 20 se zyada message rokne ki koshish karta hai, par asli suraksha Console wali limit hi hai.
- **Customer ka data** (naam, phone, address) sirf order ke Telegram message mein jaata hai. Server kuch save nahi karta.

---

### Developer notes

| File | Kaam |
|---|---|
| `dukaan/` | React app (Vite ka doosra page → `/dukaan/`) |
| `dukaan/lib/profile.js` | Profile ka format, limits, business types (browser + server dono use karte hain) |
| `dukaan/lib/templates.js` | 5 sample businesses |
| `dukaan/lib/link.js` | Profile ko share link mein pack karna (`#d=...`) |
| `api/dukaan-chat.js` | Vercel function: POST chat, GET `?shop=` profile |
| `api/_dukaan/bot.js` | System prompt, `place_order` tool, Claude loop |
| `api/_dukaan/shops.js` | Paying clients ki list |
| `api/_dukaan/bot.test.js` | `npm test` |

`npm run dev` sirf page chalata hai, `/api` nahi. Poora chalane ke liye `vercel dev` (Vercel CLI) chahiye, `ANTHROPIC_API_KEY` ke saath.
