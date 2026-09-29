// Profile Kit: ready-to-paste text for LinkedIn, Upwork and Fiverr, built around the live demos.
// Honest by design: it says the work is AI-assisted and claims no experience or clients that don't exist yet.

export const SETUP_STEPS = [
  { id: 'keys', text: 'Vercel mein keys daali aur GitHub pe PR merge kiya (ek baar)' },
  { id: 'photo', text: 'LinkedIn: saaf, muskurati hui profile photo lagayi' },
  { id: 'li-headline', text: 'LinkedIn: headline badli (neeche se copy)' },
  { id: 'li-about', text: 'LinkedIn: About paste kiya' },
  { id: 'li-featured', text: 'LinkedIn: Featured mein portfolio link joda' },
  { id: 'li-services', text: 'LinkedIn: "Open to → Providing services" on kiya (clients seedha request bhej sakte hain)' },
  { id: 'warm', text: '20 jaan-pehchaan walon ko message bheja (neeche wala message)' },
  { id: 'upwork', text: 'Upwork profile + 1 Project Catalog (optional)' },
]

export const DAILY_STEPS = [
  '5 min: 5 business owners ki posts pe achha comment (2-3 line, madad wala, "nice post" nahi)',
  '15 min: 5 post / job paste karo → "Demo + message banao" → bhejo',
  '5 min: Leads → Aaj ka kaam → follow-ups',
  'Reply aaye → lead kholo → reply paste → "Jawab likho"',
  'Hafte mein 1 baar: ek demo ka screenshot + 3 line ki post (neeche template)',
]

export const RULES = [
  'Connection request zyada tar bina note ke bhejo. Accept hone ke baad demo wala message bhejo.',
  'Note sirf 🔥 hot lead ke liye (free account mein mahine ke kuch hi note milte hain).',
  'Roz 15-20 se zyada request mat bhejo. Hafte mein ~100 ki limit hai, uske upar account ruk sakta hai.',
  'Kisi bhi bot/extension se LinkedIn mat chalao. Sab khud bhejo.',
]

export function kitSections(name, origin) {
  const first = name.split(' ')[0] || name
  const work = `${origin}/work/`
  const demo = `${origin}/dukaan/?shop=sharma-dhaba`
  return [
    {
      title: 'LinkedIn',
      help: 'Profile kholo → apne naam ke paas ✏️ → Headline. Phir About section mein ✏️. Featured mein "Add link" → portfolio link.',
      items: [
        { label: 'Headline', max: 220, text: 'Freelance AI Chatbot & Web App Developer | I build assistants that answer your customers and take orders | Live demos below' },
        {
          label: 'About',
          max: 2600,
          text: `I help small businesses and startups put AI to work, without a big budget or a long project.

What I build:
• AI chat assistants that answer customer questions (prices, timings, menu) and take orders or bookings, then send them straight to the owner's phone
• Automations that save hours: lead sorting, drafted replies, follow-up reminders, alerts
• Small web apps that install on a phone: booking pages, dashboards, trackers

How I work: I use AI-assisted development (Claude) to build and test quickly, so you see a working version in days, not weeks. I review and test everything myself and I'm responsible for what I deliver.

See my work and try the live demos: ${work}

If your customers keep asking the same questions, or you lose orders after hours, message me. I'll show you a demo built on your own business details within 24 hours.`,
        },
        { label: 'Featured link', text: work },
        {
          label: 'Jaan-pehchaan walon ko message (20 logon ko)',
          text: `Hi! Quick update: I've started building AI assistants for small businesses. They answer customers on a link (prices, timings, menu) and take orders or bookings 24x7.

Here's a 1-minute demo: ${demo}

Do you know a shop, clinic, restaurant or small business owner who could use this? An intro would mean a lot 🙏`,
        },
        {
          label: 'Hafte ki post (template)',
          text: `This week I built a demo AI assistant for a {kind of business} in {city}.

It answers customer questions from their own menu and takes orders, then sends each order to the owner's phone. It took {time} to build.

Try it yourself: {demo link}

If your customers keep asking the same questions, I can build one for your business too.`,
        },
      ],
    },
    {
      title: 'Upwork',
      help: 'upwork.com → Sign up → "I\'m a freelancer". Profile photo zaroor lagao (saaf, muskurata hua). Pehle fixed-price chhote kaam lo, review banne do. Upwork pe apna email ya phone number kabhi mat likhna, ye rules ke khilaaf hai.',
      items: [
        { label: 'Title', max: 70, text: 'AI Chatbot & Automation Developer | Fast AI-Assisted Delivery' },
        {
          label: 'Overview',
          max: 5000,
          text: `Need an AI assistant that answers your customers and takes orders, working in days instead of weeks? That's what I build.

I'm an AI-assisted developer: I use Claude to design, write and test code quickly, and I personally review and test everything I hand over. You get a working demo early, a fixed price agreed upfront, and clear communication.

What I can do for you:
✔ AI customer chat assistant on a shareable link: answers questions from your own details, collects orders and bookings, alerts you on Telegram
✔ Lead and message automation: sort incoming leads, draft personal replies, follow-up reminders
✔ Small web apps: booking pages, dashboards, internal tools (React, Vercel)
✔ Adding Claude / AI features to an existing website

Live demos: ${work}

My process:
1. A short chat to understand the problem
2. Fixed price and timeline in writing
3. Working demo in 2-3 days
4. Launch, then 2 weeks of free fixes

Message me with what you'd like to automate and I'll reply with a quick plan and price.`,
        },
        { label: 'Skills (ek-ek karke daalo)', text: 'AI Chatbot, Chatbot Development, Claude, API Integration, Automation, React, JavaScript, Web Application, Telegram Bot, Progressive Web App' },
        { label: 'Hourly rate (shuru ke liye)', text: '$18/hr — pehle 3-5 reviews ke baad badhana' },
        {
          label: 'Project Catalog: title',
          max: 75,
          text: 'An AI chat assistant that answers your customers and takes orders',
        },
        {
          label: 'Project Catalog: description + 3 packages',
          text: `Your customers ask the same questions all day: prices, timings, "do you deliver?". I'll build an AI assistant that answers them from your own menu or service list, takes orders or bookings, and sends each one to your phone.

It works as a link you can share on WhatsApp, Instagram, Google Maps or a QR code at your counter. It speaks English, Hindi, Hinglish or Punjabi. Try a live demo: ${demo}

Starter ($149, 5 days): assistant built from your menu or services (up to 50 items), order and booking capture, shareable link
Standard ($299, 7 days): Starter + Telegram order alerts, your name and colours, 2 rounds of changes
Advanced ($499, 10 days): Standard + embedded on your website, extra languages, 30 days of support`,
        },
        {
          label: 'Proposal template ({ } wali jagah bharo)',
          text: `Hi {client name},

{Their problem in one line, in your own words, e.g. "You want customers to be able to order cakes on WhatsApp without you replying to every message."}

I recently built something close to this: an AI assistant that answers customer questions and takes orders, then sends each one to the owner's phone. You can try it in one minute: ${demo}

For your project I would:
1. {first step}
2. {second step}
3. {third step}

I can show you a working demo in {2-3} days. Fixed price: \${amount}.

One question: {a specific question about their project}?

${first}`,
        },
      ],
    },
    {
      title: 'Fiverr (optional)',
      help: 'fiverr.com → Become a Seller → Create a Gig. Category: Programming & Tech → AI Development / Chatbots.',
      items: [
        { label: 'Gig title', max: 80, text: 'I will build an AI chatbot that answers customers and takes orders' },
        {
          label: 'Gig description',
          max: 1200,
          text: `Tired of answering the same customer questions all day? I'll build an AI assistant for your business that:

✔ Answers questions about prices, timings, menu and delivery from YOUR details, with no made-up answers
✔ Takes orders and appointment bookings
✔ Sends every order to your phone (Telegram)
✔ Works as a link for WhatsApp, Instagram or a QR code
✔ Speaks English, Hindi, Hinglish or Punjabi

I use AI-assisted development, so you get a working demo fast. Every build is tested by hand before delivery.

Try a live demo before you order: ${demo}

Message me before ordering. Tell me about your business and I'll suggest the right package.`,
        },
        { label: 'Packages', text: 'Basic $149 (5 days) · Standard $299 (7 days) · Premium $499 (10 days) — Upwork catalog jaise hi' },
      ],
    },
  ]
}
