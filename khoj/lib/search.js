// One-tap search links. They only open LinkedIn/Google search pages; the user does the browsing.

const enc = encodeURIComponent

export const PERIODS = { 'past-24h': '24 ghante', 'past-week': '1 hafta', 'past-month': '1 mahina' }

// LinkedIn post search, newest first. Quoted phrases match exactly.
export function postSearchUrl(keywords, period = 'past-24h') {
  return `https://www.linkedin.com/search/results/content/?keywords=${enc(keywords)}&datePosted=${enc(`"${period}"`)}&sortBy=${enc('"date_posted"')}`
}

export function peopleSearchUrl(keywords) {
  return `https://www.linkedin.com/search/results/people/?keywords=${enc(keywords)}`
}

// Google fallback for LinkedIn posts (works without logging in to LinkedIn).
const GOOGLE_PERIOD = { 'past-24h': 'd', 'past-week': 'w', 'past-month': 'm' }
export function googlePostsUrl(phrase, period = 'past-week') {
  return `https://www.google.com/search?q=${enc(`site:linkedin.com/posts ${phrase}`)}&tbs=qdr:${GOOGLE_PERIOD[period] ?? 'w'}`
}

export function upworkSearchUrl(q) {
  return `https://www.upwork.com/nx/search/jobs/?q=${enc(q)}&sort=recency`
}

// A short list on purpose: the searches most likely to turn up someone who needs a bot or small app now.
export const POST_PRESETS = [
  { label: 'Developer chahiye', q: '"looking for a developer" OR "looking for a freelancer"' },
  { label: 'Chatbot chahiye', q: '"need a chatbot" OR "WhatsApp bot" OR "AI assistant for my business"' },
  { label: 'Website chahiye', q: '"need a website" OR "looking for web developer"' },
  { label: 'AI automation', q: '"AI automation" looking for OR need' },
]

// Hidden leads: businesses hiring for repetitive work an AI assistant can take over. Few freelancers pitch these.
export const SIGNAL_PRESETS = [
  { label: 'Support staff hiring', q: '"hiring" "customer support executive"' },
  { label: 'Receptionist hiring', q: '"hiring" receptionist clinic OR salon OR hotel' },
  { label: 'Too many DMs', q: '"too many messages" OR "can\'t reply to everyone" business' },
]

export const UPWORK_PRESETS = [
  { label: 'Chatbot jobs', q: 'chatbot' },
  { label: 'AI automation jobs', q: 'AI automation' },
  { label: 'Claude / AI jobs', q: 'Claude AI' },
]

// Business owners who might want a bot but haven't asked.
export const localPresets = (city) => [
  { label: `Restaurant owners · ${city}`, q: `restaurant owner ${city}` },
  { label: `Salon / clinic · ${city}`, q: `salon OR clinic owner ${city}` },
]
