// Registered shops: paying clients whose bot runs from a fixed link, /dukaan/?shop=<id>.
// For these the server uses the profile below and ignores whatever the browser sends,
// so a customer can't change the prices or rules. Orders go to telegramChatIds on Telegram
// (needs DUKAAN_TELEGRAM_TOKEN); with no chat IDs they go to DUKAAN_OWNER_CHAT_ID instead.
//
// Naya client jodna: TEMPLATES jaisa profile likho (ya Setup mein bana ke "Profile copy karo" se paste karo),
// ek chhota id do, deploy karo, aur client ko /dukaan/?shop=<id> link do.
import { TEMPLATES } from '../../dukaan/lib/templates.js'

export const SHOPS = {
  // Sample entry so the fixed-link mode can be tried right away. Replace it with real clients.
  'sharma-dhaba': {
    profile: TEMPLATES.restaurant,
    telegramChatIds: [],
  },
}
