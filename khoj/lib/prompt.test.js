// Run: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyDemoLink, buildClaudeAppPrompt, buildDraftPrompt, buildProjectBrief, buildReplyMessage } from './prompt.js'
import { demoProfile } from './demo.js'

const me = { name: 'Guri Singh', offer: 'AI chat assistants for small businesses', demoLink: '', portfolio: '', language: 'english' }

test('applyDemoLink fills the placeholder, or removes it cleanly when there is no demo', () => {
  const drafts = { connection_note: 'Hi', message: 'Here is your demo: {DEMO_LINK} - thoughts?', comment: '', follow_up: 'See {DEMO_LINK}' }
  const filled = applyDemoLink(drafts, 'https://x.test/dukaan/#d=z1')
  assert.equal(filled.message, 'Here is your demo: https://x.test/dukaan/#d=z1 - thoughts?')
  assert.equal(filled.follow_up, 'See https://x.test/dukaan/#d=z1')
  const empty = applyDemoLink(drafts, '')
  assert.equal(empty.message, 'Here is your demo: - thoughts?')
  assert.equal(empty.follow_up, 'See')
  assert.equal(drafts.message.includes('{DEMO_LINK}'), true) // input untouched
})

test('prompts: draft prompt covers all sources; free prompt has no demo JSON', () => {
  const d = buildDraftPrompt(me)
  assert.match(d, /Upwork/)
  assert.match(d, /at most 190 characters/)
  assert.match(d, /demo\.suitable/)
  const free = buildClaudeAppPrompt(me, { text: 'Need a website for my clinic', url: '' })
  assert.doesNotMatch(free, /demo\.suitable|DEMO_LINK/)
  assert.match(free, /Need a website for my clinic/)
})

test('reply message and project brief carry the conversation', () => {
  const lead = { text: 'post', person: 'Simran "S"', need: 'bot', thread: [{ from: 'me', text: 'demo' }, { from: 'them', text: 'nice' }], notes: 'budget 5k', demoLink: 'https://d', headline: 'Owner' }
  const m = buildReplyMessage(lead, 'How much?')
  assert.match(m, /person="Simran S"/)
  assert.match(m, /Me: demo\n\nThem: nice/)
  assert.match(m, /<their_latest_reply>\nHow much\?/)
  const b = buildProjectBrief(lead, me)
  assert.match(b, /Client: Simran "S" · Owner/)
  assert.match(b, /Client: nice/)
  assert.match(b, /budget 5k/)
  assert.match(b, /https:\/\/d/)
})

test('demoProfile makes a Dukaan profile labelled as a sample', () => {
  assert.equal(demoProfile({ suitable: false }, 'english'), null)
  const p = demoProfile({ suitable: true, name: 'Sweet Crumbs', type: 'restaurant', kind: 'order', city: 'Ludhiana', catalog: 'Cake - 500', info: 'This is a demo with sample prices and details.' }, 'hinglish')
  assert.equal(p.name, 'Sweet Crumbs')
  assert.equal(p.language, 'hinglish')
  assert.match(p.greeting, /demo assistant hoon \(sample rates\)/)
  assert.match(demoProfile({ suitable: true, name: 'Glow', type: 'salon', kind: 'booking', city: '', catalog: '', info: '' }, 'english').greeting, /test appointment/)
})
