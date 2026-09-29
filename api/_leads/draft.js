// Client Khoj: turns a pasted post (LinkedIn, Upwork, anywhere) into a lead verdict, outreach drafts and a
// personal demo profile; and turns a client's reply into the next message. The user sends everything by hand.
import { createHash, timingSafeEqual } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { betaJSONSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/beta/json-schema'
import { DEMO_TYPES, LANGUAGES, SOURCES, buildDraftPrompt, buildLeadMessage, buildReplyMessage, buildReplyPrompt } from '../../khoj/lib/prompt.js'

export const DEFAULT_MODEL = 'claude-opus-5'

export const LIMITS = { text: 4000, url: 300, name: 80, offer: 800, link: 300, reply: 2000, thread: 10, threadText: 800 }

// Character caps on the drafts. Free LinkedIn accounts allow 200 characters in a connection note; Upwork proposals run longer.
export const DRAFT_LIMITS = { connection_note: 200, message: 1500, comment: 300, follow_up: 300 }

const s = { type: 'string' }
const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    source: { type: 'string', enum: Object.keys(SOURCES) },
    fit: { type: 'string', enum: ['hot', 'warm', 'cold'] },
    reason: s, person: s, headline: s, need: s,
    connection_note: s, message: s, comment: s, follow_up: s,
    demo: {
      type: 'object',
      properties: {
        suitable: { type: 'boolean' },
        name: s,
        type: { type: 'string', enum: DEMO_TYPES },
        kind: { type: 'string', enum: ['order', 'booking'] },
        city: s, catalog: s, info: s,
      },
      required: ['suitable', 'name', 'type', 'kind', 'city', 'catalog', 'info'],
      additionalProperties: false,
    },
  },
  required: ['source', 'fit', 'reason', 'person', 'headline', 'need', 'connection_note', 'message', 'comment', 'follow_up', 'demo'],
  additionalProperties: false,
}

const REPLY_SCHEMA = {
  type: 'object',
  properties: {
    reply: s,
    next_step: s,
    status: { type: 'string', enum: ['replied', 'call', 'won', 'lost'] },
  },
  required: ['reply', 'next_step', 'status'],
  additionalProperties: false,
}

// Constant-time check of the access code (LEADS_CODE), so the endpoint isn't a free AI proxy for strangers.
export function codeMatches(given, expected) {
  if (typeof given !== 'string' || !expected) return false
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

const clip = (v, max) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, max) : '')

function parseMe(m = {}) {
  return {
    name: clip(m.name, LIMITS.name),
    offer: clip(m.offer, LIMITS.offer),
    demoLink: clip(m.demoLink, LIMITS.link),
    portfolio: clip(m.portfolio, LIMITS.link),
    language: Object.hasOwn(LANGUAGES, m.language) ? m.language : 'english',
  }
}

export function parseDraftRequest(body) {
  const me = parseMe(body?.me)
  if (!me.name || !me.offer) return { status: 400, error: 'Settings mein apna naam aur "main kya karta hoon" bharo.' }
  const l = body?.lead ?? {}

  if (body?.mode === 'reply') {
    const reply = clip(body?.reply, LIMITS.reply)
    if (!reply) return { status: 400, error: 'Client ka reply paste karo.' }
    const thread = (Array.isArray(l.thread) ? l.thread : []).slice(-LIMITS.thread)
      .filter((t) => t && (t.from === 'me' || t.from === 'them'))
      .map((t) => ({ from: t.from, text: clip(t.text, LIMITS.threadText) }))
      .filter((t) => t.text)
    return {
      mode: 'reply', me, reply,
      lead: { text: clip(l.text, 1500), person: clip(l.person, LIMITS.name), need: clip(l.need, 300), thread },
    }
  }

  const lead = { text: clip(l.text, LIMITS.text), url: clip(l.url, LIMITS.url) }
  if (lead.text.length < 20) return { status: 400, error: 'Post ya profile ka text paste karo (kam se kam ek line).' }
  return { mode: 'draft', me, lead }
}

// Adaptive thinking at medium effort: a short writing task where tone matters. Haiku 4.5 takes neither.
export function modelParams(model) {
  if (model.startsWith('claude-haiku')) return { output_config: {} }
  const params = { thinking: { type: 'adaptive' }, output_config: { effort: 'medium' } }
  // Server-side fallback: if Claude declines, the API retries on another model within the same call.
  if (/^claude-(opus-5|fable-5)/.test(model)) Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
  return params
}

export class DraftError extends Error {}

async function structured({ client, model, system, user, schema }) {
  const { output_config, ...rest } = modelParams(model)
  let response
  try {
    response = await client.beta.messages.parse({
      model,
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { ...output_config, format: betaJSONSchemaOutputFormat(schema) },
      ...rest,
    })
  } catch (err) {
    // parse() throws a plain AnthropicError when the JSON is cut short; real API errors pass through to the handler.
    if (err instanceof Anthropic.AnthropicError && !(err instanceof Anthropic.APIError)) throw new DraftError('AI ka jawab adhoora aaya. Phir se try karo.')
    throw err
  }
  if (response.stop_reason === 'refusal') throw new DraftError('AI ne is text pe likhne se mana kar diya. Koi aur post try karo.')
  if (!response.parsed_output) throw new DraftError('AI ka jawab samajh nahi aaya. Phir se try karo.')
  return response.parsed_output
}

export async function draftLead({ client, model = DEFAULT_MODEL, me, lead }) {
  const d = await structured({ client, model, system: buildDraftPrompt(me), user: buildLeadMessage(lead), schema: DRAFT_SCHEMA })
  const draft = {
    source: Object.hasOwn(SOURCES, d.source) ? d.source : 'other',
    fit: ['hot', 'warm', 'cold'].includes(d.fit) ? d.fit : 'cold',
  }
  for (const key of ['reason', 'person', 'headline', 'need']) draft[key] = clip(d[key], 300)
  for (const [key, max] of Object.entries(DRAFT_LIMITS)) draft[key] = clip(d[key], max)
  const demo = d.demo ?? {}
  draft.demo = draft.fit !== 'cold' && demo.suitable === true && clip(demo.name, 80)
    ? {
        suitable: true,
        name: clip(demo.name, 80),
        type: DEMO_TYPES.includes(demo.type) ? demo.type : 'other',
        kind: demo.kind === 'booking' ? 'booking' : 'order',
        city: clip(demo.city, 80),
        catalog: clip(demo.catalog, 4000),
        info: clip(demo.info, 2000),
      }
    : { suitable: false }
  return draft
}

export async function replyLead({ client, model = DEFAULT_MODEL, me, lead, reply }) {
  const r = await structured({ client, model, system: buildReplyPrompt(me), user: buildReplyMessage(lead, reply), schema: REPLY_SCHEMA })
  return {
    reply: clip(r.reply, 1500),
    next_step: clip(r.next_step, 300),
    status: ['replied', 'call', 'won', 'lost'].includes(r.status) ? r.status : 'replied',
  }
}
