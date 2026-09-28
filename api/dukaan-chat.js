// Dukaan Saathi chat (Vercel serverless).
//   POST { messages, profile | shopId, demoCode? } -> { reply, order }
//   GET  ?shop=<id>                                  -> { profile } for a registered shop's public page
// Env: ANTHROPIC_API_KEY (required), DUKAAN_MODEL, DUKAAN_DEMO_CODE,
//      DUKAAN_TELEGRAM_TOKEN + DUKAAN_OWNER_CHAT_ID (order alerts). Setup steps: DUKAAN.md.
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL, orderMessage, parseChatRequest, runChat } from './_dukaan/bot.js'
import { SHOPS } from './_dukaan/shops.js'
import { chatIdsFromEnv, sendTelegram } from './_dukaan/telegram.js'
import { normalizeProfile } from '../dukaan/lib/profile.js'

// Best-effort per-IP limit. It lives in one warm instance only, so it slows down scripts rather than stopping them;
// the real cap on spend is the monthly limit set in the Anthropic Console.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const hits = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > MAX_PER_WINDOW
}

let client
const getClient = () => (client ??= new Anthropic())

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store')

  if (req.method === 'GET') {
    const id = String(req.query.shop ?? '')
    const shop = Object.hasOwn(SHOPS, id) ? SHOPS[id] : null
    if (!shop) return res.status(404).json({ error: 'Ye dukaan nahi mili.' })
    return res.status(200).json({ profile: normalizeProfile(shop.profile) })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) return res.status(429).json({ error: 'Bahut tez messages aa rahe hain. 1 minute baad try karo.' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Bot abhi setup nahi hua: Vercel mein ANTHROPIC_API_KEY daalna hai (DUKAAN.md dekho).' })
  }

  const parsed = parseChatRequest(req.body, { shops: SHOPS, demoCode: process.env.DUKAAN_DEMO_CODE ?? '' })
  if (parsed.error) return res.status(parsed.status).json({ error: parsed.error })
  const { profile, history, shopId, telegramChatIds } = parsed

  const onOrder = async (order) => {
    const chatIds = telegramChatIds.length ? telegramChatIds : chatIdsFromEnv(process.env.DUKAAN_OWNER_CHAT_ID)
    const text = orderMessage(profile, order, { demo: !shopId })
    return { notified: await sendTelegram(process.env.DUKAAN_TELEGRAM_TOKEN, chatIds, text) }
  }

  try {
    const result = await runChat({
      client: getClient(),
      model: process.env.DUKAAN_MODEL || DEFAULT_MODEL,
      profile,
      history,
      onOrder,
    })
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error('dukaan: API key rejected', err.message)
      return res.status(503).json({ error: 'ANTHROPIC_API_KEY galat hai ya band ho gayi. Vercel settings check karo.' })
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error('dukaan: request rejected', err.message)
      return res.status(503).json({ error: 'AI ne request mana kar di. Anthropic Console mein billing/credits check karo, phir Vercel logs dekho.' })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Abhi bahut log baat kar rahe hain. Thodi der baad try karo.' })
    }
    if (err instanceof Anthropic.APIError && err.status >= 500) {
      return res.status(503).json({ error: 'AI thoda busy hai. 1 minute baad try karo.' })
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return res.status(502).json({ error: 'AI se connect nahi ho paaya. Phir se try karo.' })
    }
    console.error('dukaan: chat failed', err)
    return res.status(500).json({ error: 'Kuch gadbad ho gayi. Phir se try karo.' })
  }
}
