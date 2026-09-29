// Lead records, statuses and the "what to do today" logic. Pure functions; storage lives in App.jsx.

export const STATUSES = {
  new: { label: 'Naya', emoji: '🆕' },
  sent: { label: 'Message bheja', emoji: '📤' },
  replied: { label: 'Reply aaya', emoji: '💬' },
  call: { label: 'Call / meeting', emoji: '📞' },
  won: { label: 'Client bana', emoji: '🎉' },
  lost: { label: 'Nahi hua', emoji: '✖️' },
}

export const FOLLOW_UP_DAYS = 3
export const MAX_FOLLOW_UPS = 2
const DAY = 86_400_000

export function makeLead(draft, input, now = Date.now()) {
  return {
    id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    url: input.url ?? '',
    text: (input.text ?? '').slice(0, 1500),
    person: draft.person,
    headline: draft.headline,
    need: draft.need,
    fit: draft.fit,
    reason: draft.reason,
    drafts: {
      connection_note: draft.connection_note,
      message: draft.message,
      comment: draft.comment,
      follow_up: draft.follow_up,
    },
    status: 'new',
    sentAt: null,
    followUpAts: [],
    notes: '',
  }
}

export function markSent(lead, now = Date.now()) {
  return { ...lead, status: 'sent', sentAt: lead.sentAt ?? now }
}

export function markFollowedUp(lead, now = Date.now()) {
  return { ...lead, followUpAts: [...lead.followUpAts, now] }
}

// A follow-up is due when a message went out 3+ days ago (since the last nudge), with no reply, at most twice.
export function isFollowUpDue(lead, now = Date.now()) {
  if (lead.status !== 'sent' || !lead.sentAt || lead.followUpAts.length >= MAX_FOLLOW_UPS) return false
  const last = lead.followUpAts.at(-1) ?? lead.sentAt
  return now - last >= FOLLOW_UP_DAYS * DAY
}

export const daysSince = (t, now = Date.now()) => Math.floor((now - t) / DAY)

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()

// Messages sent today on this device: first messages plus follow-ups.
export function sentToday(leads, now = Date.now()) {
  let n = 0
  for (const l of leads) {
    if (l.sentAt && sameDay(l.sentAt, now)) n++
    n += l.followUpAts.filter((t) => sameDay(t, now)).length
  }
  return n
}

const FIT_RANK = { hot: 0, warm: 1, cold: 2 }

// Work queue order: follow-ups due, then unsent leads (hot first), then everything else by newest.
export function workOrder(leads, now = Date.now()) {
  const rank = (l) => (isFollowUpDue(l, now) ? 0 : l.status === 'new' ? 1 + FIT_RANK[l.fit] : 10)
  return [...leads].sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt)
}

export const FILTERS = {
  todo: { label: 'Aaj ka kaam', test: (l, now) => isFollowUpDue(l, now) || (l.status === 'new' && l.fit !== 'cold') },
  all: { label: 'Sab', test: () => true },
  sent: { label: 'Bheje', test: (l) => l.status === 'sent' },
  replied: { label: 'Reply / call', test: (l) => l.status === 'replied' || l.status === 'call' },
  won: { label: 'Clients', test: (l) => l.status === 'won' },
}

export function findDuplicate(leads, url) {
  const clean = (u) => u.split('?')[0].replace(/\/+$/, '').toLowerCase()
  return url ? leads.find((l) => l.url && clean(l.url) === clean(url)) ?? null : null
}
