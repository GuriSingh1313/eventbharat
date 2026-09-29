// Run: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FILTERS, findDuplicate, isFollowUpDue, makeLead, markFollowedUp, markSent, sentToday, workOrder } from './leads.js'
import { googlePostsUrl, peopleSearchUrl, postSearchUrl } from './search.js'

const DAY = 86_400_000
const T0 = new Date('2026-09-29T10:00:00').getTime()
const draft = (fit, extra = {}) => ({ fit, reason: '', person: 'A', headline: '', need: '', connection_note: 'hi', message: 'm', comment: '', follow_up: 'f', ...extra })

test('search links open LinkedIn/Google searches with the right filters', () => {
  const u = new URL(postSearchUrl('"looking for a developer"', 'past-week'))
  assert.equal(u.hostname, 'www.linkedin.com')
  assert.equal(u.searchParams.get('keywords'), '"looking for a developer"')
  assert.equal(u.searchParams.get('datePosted'), '"past-week"')
  assert.equal(u.searchParams.get('sortBy'), '"date_posted"')
  assert.equal(new URL(peopleSearchUrl('salon owner Ludhiana')).searchParams.get('keywords'), 'salon owner Ludhiana')
  const g = new URL(googlePostsUrl('"need a chatbot"', 'past-24h'))
  assert.equal(g.searchParams.get('q'), 'site:linkedin.com/posts "need a chatbot"')
  assert.equal(g.searchParams.get('tbs'), 'qdr:d')
})

test('follow-ups come due after 3 days, at most twice, and stop on reply', () => {
  let l = markSent(makeLead(draft('hot'), { url: 'u', text: 't' }, T0), T0)
  assert.equal(isFollowUpDue(l, T0 + 2 * DAY), false)
  assert.equal(isFollowUpDue(l, T0 + 3 * DAY), true)
  l = markFollowedUp(l, T0 + 3 * DAY)
  assert.equal(isFollowUpDue(l, T0 + 5 * DAY), false)
  assert.equal(isFollowUpDue(l, T0 + 6 * DAY), true)
  l = markFollowedUp(l, T0 + 6 * DAY)
  assert.equal(isFollowUpDue(l, T0 + 30 * DAY), false)
  const replied = { ...markSent(makeLead(draft('hot'), {}, T0), T0), status: 'replied' }
  assert.equal(isFollowUpDue(replied, T0 + 10 * DAY), false)
  // marking sent twice keeps the first send time
  assert.equal(markSent(markSent(makeLead(draft('hot'), {}, T0), T0), T0 + DAY).sentAt, T0)
})

test('sentToday counts first messages and follow-ups sent today', () => {
  const a = markSent(makeLead(draft('hot'), {}, T0), T0)
  const b = markFollowedUp(markSent(makeLead(draft('warm'), {}, T0 - 4 * DAY), T0 - 4 * DAY), T0 + 1000)
  const c = makeLead(draft('warm'), {}, T0)
  assert.equal(sentToday([a, b, c], T0 + 2000), 2)
  assert.equal(sentToday([a, b, c], T0 + DAY), 0)
})

test('work queue puts due follow-ups first, then hot, warm, cold new leads', () => {
  const due = markSent(makeLead(draft('warm', { person: 'due' }), {}, T0 - 5 * DAY), T0 - 5 * DAY)
  const hot = makeLead(draft('hot', { person: 'hot' }), {}, T0 - 2)
  const warm = makeLead(draft('warm', { person: 'warm' }), {}, T0 - 1)
  const cold = makeLead(draft('cold', { person: 'cold' }), {}, T0)
  const won = { ...makeLead(draft('hot', { person: 'won' }), {}, T0), status: 'won' }
  assert.deepEqual(workOrder([won, cold, warm, hot, due], T0).map((l) => l.person), ['due', 'hot', 'warm', 'cold', 'won'])
  assert.deepEqual([won, cold, warm, hot, due].filter((l) => FILTERS.todo.test(l, T0)).map((l) => l.person), ['warm', 'hot', 'due'])
})

test('findDuplicate matches the same LinkedIn URL ignoring query and trailing slash', () => {
  const l = makeLead(draft('hot'), { url: 'https://www.linkedin.com/posts/abc/' }, T0)
  assert.equal(findDuplicate([l], 'https://www.linkedin.com/posts/abc?utm_source=share'), l)
  assert.equal(findDuplicate([l], 'https://www.linkedin.com/posts/xyz'), null)
  assert.equal(findDuplicate([l], ''), null)
})
