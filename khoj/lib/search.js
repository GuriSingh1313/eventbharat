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

// Posts where someone is asking for help right now.
export const POST_PRESETS = [
  { label: 'Developer chahiye', q: '"looking for a developer"' },
  { label: 'Freelancer chahiye', q: '"looking for a freelancer"' },
  { label: 'Chatbot chahiye', q: '"need a chatbot" OR "looking for chatbot"' },
  { label: 'AI automation', q: '"AI automation" looking for' },
  { label: 'WhatsApp bot', q: '"WhatsApp bot" OR "WhatsApp automation" need' },
  { label: 'Website chahiye', q: '"need a website" OR "looking for web developer"' },
  { label: 'React developer', q: '"freelance react developer"' },
  { label: 'App banwana hai', q: '"need an app developer" OR "looking for app developer"' },
]

// Business owners who might want a bot but haven't asked.
export const localPresets = (city) => [
  { label: `Restaurant owners · ${city}`, q: `restaurant owner ${city}` },
  { label: `Salon owners · ${city}`, q: `salon owner ${city}` },
  { label: `Clinics · ${city}`, q: `clinic founder ${city}` },
  { label: `Coaching · ${city}`, q: `coaching institute director ${city}` },
  { label: `Real estate · ${city}`, q: `real estate agent ${city}` },
]
