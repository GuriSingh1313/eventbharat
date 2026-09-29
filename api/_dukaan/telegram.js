// Sends order alerts to the owner's Telegram through the bot in DUKAAN_TELEGRAM_TOKEN.
export async function sendTelegram(token, chatIds, text) {
  if (!token || !chatIds.length) return false
  const sent = await Promise.all(chatIds.map(async (chatId) => {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(5000),
      })
      if (!r.ok) console.error('dukaan: telegram', r.status, await r.text())
      return r.ok
    } catch (err) {
      console.error('dukaan: telegram', err)
      return false
    }
  }))
  return sent.some(Boolean)
}

export const chatIdsFromEnv = (value) => String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean)
