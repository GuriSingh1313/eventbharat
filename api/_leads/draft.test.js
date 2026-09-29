// Run: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import Anthropic from '@anthropic-ai/sdk'
import { DraftError, codeMatches, draftLead, modelParams, parseDraftRequest, replyLead } from './draft.js'

const me = { name: 'Guri', offer: 'AI chatbots and React websites for small businesses', demoLink: 'https://x.test/dukaan/', portfolio: '', language: 'english' }
const lead = { text: 'Looking for a developer to build a WhatsApp bot for my bakery in Ludhiana. DM me!', url: 'https://www.linkedin.com/posts/abc' }
const demo = { suitable: true, name: 'Sweet Crumbs', type: 'restaurant', kind: 'order', city: 'Ludhiana', catalog: 'Chocolate cake - 550', info: 'This is a demo with sample prices and details.' }
const good = {
  source: 'linkedin', fit: 'hot', reason: 'Asking for a bot right now.', person: 'Simran Kaur', headline: 'Owner, Sweet Crumbs Bakery',
  need: 'WhatsApp order bot for a bakery', connection_note: 'n'.repeat(400), message: 'Hi Simran, I built you a demo: {DEMO_LINK}', comment: 'Happy to help', follow_up: 'Hi again', demo,
}

function fakeClient(response) {
  const calls = []
  return {
    calls,
    beta: { messages: { parse: async (params) => { calls.push(params); if (response instanceof Error) throw response; return response } } },
  }
}

test('codeMatches only accepts the exact code', () => {
  assert.equal(codeMatches('guri123', 'guri123'), true)
  assert.equal(codeMatches('guri12', 'guri123'), false)
  assert.equal(codeMatches(undefined, 'guri123'), false)
  assert.equal(codeMatches('', ''), false)
})

test('parseDraftRequest: drafts need text and my details; replies need the reply', () => {
  assert.equal(parseDraftRequest({ me, lead: { text: 'hi' } }).status, 400)
  assert.equal(parseDraftRequest({ me: { name: 'Guri' }, lead }).status, 400)
  const p = parseDraftRequest({ me: { ...me, language: 'french' }, lead: { text: 'x'.repeat(9000), url: lead.url } })
  assert.equal(p.mode, 'draft')
  assert.equal(p.lead.text.length, 4000)
  assert.equal(p.me.language, 'english')
  assert.equal(parseDraftRequest({ me, mode: 'reply', lead }).status, 400)
  const r = parseDraftRequest({ me, mode: 'reply', reply: ' Sounds good, price? ', lead: { ...lead, thread: [{ from: 'me', text: 'hi' }, { from: 'bot', text: 'x' }, { from: 'them', text: '' }] } })
  assert.equal(r.mode, 'reply')
  assert.equal(r.reply, 'Sounds good, price?')
  assert.deepEqual(r.lead.thread, [{ from: 'me', text: 'hi' }])
})

test('modelParams: medium effort + fallbacks on Opus 5, bare on Haiku', () => {
  assert.deepEqual(modelParams('claude-opus-5'), {
    thinking: { type: 'adaptive' }, output_config: { effort: 'medium' }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
  })
  assert.deepEqual(modelParams('claude-haiku-4-5'), { output_config: {} })
})

test('draftLead asks for structured output, keeps the demo and clamps the drafts', async () => {
  const client = fakeClient({ stop_reason: 'end_turn', parsed_output: good })
  const d = await draftLead({ client, me, lead })
  assert.equal(d.source, 'linkedin')
  assert.equal(d.fit, 'hot')
  assert.equal(d.connection_note.length, 200)
  assert.match(d.message, /\{DEMO_LINK\}/)
  assert.deepEqual(d.demo, demo)
  const req = client.calls[0]
  assert.equal(req.model, 'claude-opus-5')
  assert.equal(req.fallbacks, 'default')
  assert.equal(req.output_config.effort, 'medium')
  const schema = req.output_config.format.schema
  assert.ok(schema.required.includes('demo') && schema.required.includes('source'))
  assert.match(req.system, /free LinkedIn accounts allow 200/)
  assert.match(req.system, /\{DEMO_LINK\}/)
  assert.match(req.messages[0].content, /bakery in Ludhiana/)
})

test('draftLead drops the demo for cold or unnamed leads', async () => {
  const cold = await draftLead({ client: fakeClient({ stop_reason: 'end_turn', parsed_output: { ...good, fit: 'cold' } }), me, lead })
  assert.deepEqual(cold.demo, { suitable: false })
  const unnamed = await draftLead({ client: fakeClient({ stop_reason: 'end_turn', parsed_output: { ...good, demo: { ...demo, name: ' ' } } }), me, lead })
  assert.deepEqual(unnamed.demo, { suitable: false })
  const odd = await draftLead({ client: fakeClient({ stop_reason: 'end_turn', parsed_output: { ...good, source: 'myspace', demo: { ...demo, type: 'spaceship' } } }), me, lead })
  assert.equal(odd.source, 'other')
  assert.equal(odd.demo.type, 'other')
})

test('replyLead returns the next message, a next step and a valid status', async () => {
  const client = fakeClient({ stop_reason: 'end_turn', parsed_output: { reply: 'Great - does Thursday 5 PM work for a 10-minute call?', next_step: 'Call fix karo', status: 'call' } })
  const r = await replyLead({ client, me, lead: { text: 'post', person: 'Simran', need: 'bot', thread: [{ from: 'me', text: 'demo link' }] }, reply: 'Nice demo! How much?' })
  assert.deepEqual(r, { reply: 'Great - does Thursday 5 PM work for a 10-minute call?', next_step: 'Call fix karo', status: 'call' })
  assert.match(client.calls[0].system, /turn a conversation with a potential client into paid work/)
  assert.match(client.calls[0].messages[0].content, /Me: demo link/)
  assert.match(client.calls[0].messages[0].content, /Nice demo! How much\?/)
  const odd = await replyLead({ client: fakeClient({ stop_reason: 'end_turn', parsed_output: { reply: 'x', next_step: 'y', status: 'married' } }), me, lead: { text: '', person: '', need: '', thread: [] }, reply: 'hi' })
  assert.equal(odd.status, 'replied')
})

test('refusals and broken JSON become friendly errors; API errors pass through', async () => {
  await assert.rejects(draftLead({ client: fakeClient({ stop_reason: 'refusal', parsed_output: null }), me, lead }), DraftError)
  await assert.rejects(draftLead({ client: fakeClient({ stop_reason: 'end_turn', parsed_output: null }), me, lead }), DraftError)
  await assert.rejects(draftLead({ client: fakeClient(new Anthropic.AnthropicError('Failed to parse structured output')), me, lead }), DraftError)
  const apiErr = new Anthropic.RateLimitError(429, { error: { type: 'rate_limit_error' } }, 'slow down', new Headers())
  await assert.rejects(draftLead({ client: fakeClient(apiErr), me, lead }), Anthropic.RateLimitError)
})
