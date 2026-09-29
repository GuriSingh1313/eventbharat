// Personal demo: turns the AI's demo profile for a lead into a Dukaan Saathi link with the lead's business name.
// The link carries the whole profile (#d=...), so there is nothing to store or deploy.
import { normalizeProfile } from '../../dukaan/lib/profile.js'

export function demoProfile(demo, language) {
  if (!demo?.suitable) return null
  const english = language === 'english'
  const booking = demo.kind === 'booking'
  return normalizeProfile({
    name: demo.name,
    type: demo.type,
    kind: demo.kind,
    city: demo.city,
    catalog: demo.catalog,
    info: demo.info,
    language: english ? 'english' : 'hinglish',
    greeting: english
      ? `Hi! 👋 I'm the demo assistant for ${demo.name} (sample prices). Ask about ${booking ? 'services, prices or timings, or book a test appointment' : 'items, prices or timings, or place a test order'}.`
      : `Namaste! 🙏 Main ${demo.name} ka demo assistant hoon (sample rates). ${booking ? 'Rate, timing poochiye ya test booking karke dekhiye' : 'Rate, timing poochiye ya test order karke dekhiye'}.`,
  })
}
