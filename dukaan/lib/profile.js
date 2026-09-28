// Dukaan Saathi - business profile shape, limits and per-type defaults.
// Shared by the browser app (dukaan/) and the serverless function (api/dukaan-chat.js),
// so both sides clean a profile the same way. Pure JS, no browser or Node APIs.

export const TYPES = {
  restaurant: { label: 'Dhaba / Restaurant', emoji: '🍛', kind: 'order', catalogLabel: 'Menu (item - price)', quick: ['Menu dikhao', 'Aaj kya special hai?', 'Home delivery hoti hai?', 'Order karna hai'] },
  kirana: { label: 'Kirana / General Store', emoji: '🛒', kind: 'order', catalogLabel: 'Saamaan (item - price)', quick: ['Kya kya milta hai?', 'Atta ka rate?', 'Delivery kab tak?', 'Order karna hai'] },
  salon: { label: 'Salon / Parlour', emoji: '💇', kind: 'booking', catalogLabel: 'Services (service - price)', quick: ['Rate list bhejo', 'Aaj slot khali hai?', 'Bridal package?', 'Appointment book karo'] },
  clinic: { label: 'Clinic / Doctor', emoji: '🩺', kind: 'booking', catalogLabel: 'Services / fees', quick: ['Doctor kab milenge?', 'Consultation fee?', 'Kal ka appointment', 'Address bhejo'] },
  coaching: { label: 'Coaching / Tuition', emoji: '📚', kind: 'booking', catalogLabel: 'Courses (course - fees)', quick: ['Kaunse courses hain?', 'Fees kitni hai?', 'Demo class milegi?', 'Admission lena hai'] },
  other: { label: 'Koi aur business', emoji: '🏪', kind: 'order', catalogLabel: 'Products / services (naam - price)', quick: ['Kya kya milta hai?', 'Rate batao', 'Timing kya hai?', 'Order karna hai'] },
}

export const LANGUAGES = {
  hinglish: { label: 'Hinglish', prompt: 'Hinglish (Hindi written in Roman script, mixed with simple English, the way people text in India)' },
  hindi: { label: 'हिन्दी', prompt: 'Hindi in Devanagari script' },
  english: { label: 'English', prompt: 'simple Indian English' },
  punjabi: { label: 'Punjabi (Roman)', prompt: 'Punjabi written in Roman script, mixed with simple Hindi/English where natural' },
}

// Character caps. They keep a request small (cost) and stop the profile from being used as a free prompt box.
export const LIMITS = {
  name: 80,
  city: 80,
  address: 200,
  timings: 200,
  phone: 40,
  catalog: 4000,
  info: 2000,
  greeting: 300,
}

const clip = (v, max) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, max) : '')

// Returns a clean profile, or null when the input can't be a profile (missing name).
export function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return null
  const p = {}
  for (const [key, max] of Object.entries(LIMITS)) p[key] = clip(raw[key], max)
  if (!p.name) return null
  p.type = Object.hasOwn(TYPES, raw.type) ? raw.type : 'other'
  p.language = Object.hasOwn(LANGUAGES, raw.language) ? raw.language : 'hinglish'
  p.kind = raw.kind === 'order' || raw.kind === 'booking' ? raw.kind : TYPES[p.type].kind
  return p
}

export function greetingFor(p) {
  if (p.greeting) return p.greeting
  return p.kind === 'booking'
    ? `Namaste! 🙏 ${p.name} mein aapka swagat hai. Rates, timing ya appointment - kuch bhi poochiye.`
    : `Namaste! 🙏 ${p.name} mein aapka swagat hai. Menu, rate ya order - kuch bhi poochiye.`
}

// ₹ formatting with Indian digit grouping (1,23,456).
export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
