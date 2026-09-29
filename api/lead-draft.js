// Client Khoj (Vercel serverless):
//   POST { code, me, lead, source }          -> { draft }   (verdict, drafts, personal demo profile)
//   POST { code, me, lead, mode: 'reply', reply } -> { coach } (next message for a client's reply)
//   POST { code, check: true }               -> { ok }
// Env: ANTHROPIC_API_KEY and LEADS_CODE (required), LEADS_MODEL (optional). Guide: KHOJ.md.
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL, DraftError, codeMatches, draftLead, parseDraftRequest, replyLead } from './_leads/draft.js'

// Best-effort per-IP limit inside one warm instance; the Anthropic Console spend limit is the real cap.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 30
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) return res.status(429).json({ error: 'Bahut tez requests. 1 minute ruko.' })

  if (!process.env.LEADS_CODE) return res.status(503).json({ error: 'Vercel mein LEADS_CODE set karo (KHOJ.md dekho).' })
  if (!codeMatches(req.body?.code, process.env.LEADS_CODE)) return res.status(401).json({ error: 'Access code galat hai.' })
  if (req.body?.check) return res.status(200).json({ ok: true })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'Vercel mein ANTHROPIC_API_KEY daalna hai (KHOJ.md dekho).' })

  const parsed = parseDraftRequest(req.body)
  if (parsed.error) return res.status(parsed.status).json({ error: parsed.error })

  try {
    const args = { client: getClient(), model: process.env.LEADS_MODEL || DEFAULT_MODEL, ...parsed }
    if (parsed.mode === 'reply') return res.status(200).json({ coach: await replyLead(args) })
    return res.status(200).json({ draft: await draftLead(args) })
  } catch (err) {
    if (err instanceof DraftError) return res.status(422).json({ error: err.message })
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error('khoj: API key rejected', err.message)
      return res.status(503).json({ error: 'ANTHROPIC_API_KEY galat hai ya band ho gayi. Vercel settings check karo.' })
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error('khoj: request rejected', err.message)
      return res.status(503).json({ error: 'AI ne request mana kar di. Anthropic Console mein billing/credits check karo, phir Vercel logs dekho.' })
    }
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'AI abhi busy hai. Thodi der baad try karo.' })
    if (err instanceof Anthropic.APIError && err.status >= 500) return res.status(503).json({ error: 'AI thoda busy hai. 1 minute baad try karo.' })
    if (err instanceof Anthropic.APIConnectionError) return res.status(502).json({ error: 'AI se connect nahi ho paaya. Phir se try karo.' })
    console.error('khoj: draft failed', err)
    return res.status(500).json({ error: 'Kuch gadbad ho gayi. Phir se try karo.' })
  }
}
