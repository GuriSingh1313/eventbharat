// ============================================
// Dukaan Saathi - AI assistant for small shops
// Demo mode (/dukaan/): set up any business, chat with its bot, share it as a link.
// Shop mode (/dukaan/?shop=<id>): the fixed, customer-facing bot of a registered client.
// ============================================

import { useEffect, useState } from 'react'
import { LANGUAGES, LIMITS, TYPES, greetingFor, normalizeProfile, rupees } from './lib/profile.js'
import { TEMPLATES } from './lib/templates.js'
import { decodeProfile, demoLink } from './lib/link.js'

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key)
      return v === null ? fallback : JSON.parse(v)
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or blocked - the app still works for this visit
    }
  },
}

const newId = () => Math.random().toString(36).slice(2)
const greetingMessage = (p) => ({ id: 'greeting', role: 'assistant', content: greetingFor(p), local: true })
const shopIdFromUrl = () => new URLSearchParams(location.search).get('shop') ?? ''

export default function App() {
  const [shopId] = useState(shopIdFromUrl)
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [fromLink, setFromLink] = useState(false)
  const [demoCode, setDemoCode] = useState(() => store.get('dukaan_demo_code', ''))
  const [tab, setTab] = useState('chat')
  const [orders, setOrders] = useState(() => store.get('dukaan_orders', []))
  const [toast, setToast] = useState('')

  // Where the business comes from: registered shop > shared link > last saved setup > sample dhaba.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (shopId) {
        try {
          const r = await fetch(`/api/dukaan-chat?shop=${encodeURIComponent(shopId)}`)
          const d = await r.json()
          if (!r.ok) throw new Error(d.error)
          if (!cancelled) setProfile(normalizeProfile(d.profile))
        } catch (err) {
          if (!cancelled) setLoadError(err.message || 'Dukaan load nahi hui.')
        }
        return
      }
      const code = new URLSearchParams(location.hash.slice(1)).get('d')
      if (code) {
        const data = await decodeProfile(code)
        const p = normalizeProfile(data)
        if (p) {
          if (cancelled) return
          if (typeof data.c === 'string' && data.c) {
            setDemoCode(data.c)
            store.set('dukaan_demo_code', data.c)
          }
          setProfile(p)
          setFromLink(true)
          return
        }
        if (!cancelled) setToast('Link toota hua hai - sample dukaan dikha rahe hain')
      }
      if (!cancelled) setProfile(normalizeProfile(store.get('dukaan_profile', null)) ?? normalizeProfile(TEMPLATES.restaurant))
    }
    load()
    return () => { cancelled = true }
  }, [shopId])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  function saveProfile(p) {
    setProfile(p)
    store.set('dukaan_profile', p)
    setFromLink(false)
    if (location.hash) history.replaceState(null, '', location.pathname + location.search)
  }

  function addOrder(order) {
    setOrders((prev) => {
      const next = [{ ...order, shop: profile.name, done: false }, ...prev].slice(0, 100)
      store.set('dukaan_orders', next)
      return next
    })
  }

  function updateOrders(next) {
    setOrders(next)
    store.set('dukaan_orders', next)
  }

  if (loadError) {
    return (
      <div className="ds-app ds-center">
        <div className="ds-empty">
          <div className="ds-empty-emoji">🏪</div>
          <p>{loadError}</p>
          <a className="ds-btn" href="/dukaan/">Demo kholo</a>
        </div>
      </div>
    )
  }
  if (!profile) return <div className="ds-app ds-center"><div className="ds-typing"><i /><i /><i /></div></div>

  const openOrders = orders.filter((o) => !o.done).length
  return (
    <div className="ds-app">
      {toast && <div className="ds-toast" role="status">{toast}</div>}
      <Header profile={profile} />
      {!shopId && (
        <nav className="ds-tabs" aria-label="Sections">
          <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>💬 Chat</button>
          <button className={tab === 'setup' ? 'on' : ''} onClick={() => setTab('setup')}>⚙️ Setup</button>
          <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>
            🧾 Orders{openOrders > 0 && <span className="ds-badge">{openOrders}</span>}
          </button>
        </nav>
      )}
      {tab === 'chat' && (
        <Chat
          key={JSON.stringify(profile)}
          profile={profile}
          shopId={shopId}
          demoCode={demoCode}
          fromLink={fromLink}
          onOrder={shopId ? null : addOrder}
          onSetup={() => setTab('setup')}
        />
      )}
      {tab === 'setup' && (
        <Setup
          profile={profile}
          demoCode={demoCode}
          onDemoCode={(c) => { setDemoCode(c); store.set('dukaan_demo_code', c) }}
          onSave={(p) => { saveProfile(p); setTab('chat'); showToast('Save ho gaya ✅ Ab chat karke dekho') }}
          toast={showToast}
        />
      )}
      {tab === 'orders' && <Orders orders={orders} onChange={updateOrders} onChat={() => setTab('chat')} />}
    </div>
  )
}

function Header({ profile }) {
  const t = TYPES[profile.type]
  const tel = profile.phone.replace(/[^\d+]/g, '')
  return (
    <header className="ds-header">
      <div className="ds-avatar" aria-hidden="true">{t.emoji}</div>
      <div className="ds-title">
        <h1>{profile.name}</h1>
        <p><span className="ds-dot" /> AI assistant · {profile.language === 'english' ? 'instant replies' : 'turant jawab'}</p>
      </div>
      {tel.length >= 8 && <a className="ds-call" href={`tel:${tel}`} aria-label={`Call ${profile.name}`}>📞</a>}
    </header>
  )
}

// ---------- CHAT ----------

function Chat({ profile, shopId, demoCode, fromLink, onOrder, onSetup }) {
  const [messages, setMessages] = useState(() => [greetingMessage(profile)])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  // The page itself scrolls (steadier with the iPhone keyboard), so keep the newest message above the composer.
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function send(text, base = messages) {
    const clean = text.trim()
    if (!clean || sending) return
    const next = [...base, { id: newId(), role: 'user', content: clean }]
    setMessages(next)
    setInput('')
    setSending(true)
    const body = { messages: next.filter((m) => !m.local && !m.error).map(({ role, content }) => ({ role, content })) }
    if (shopId) body.shopId = shopId
    else Object.assign(body, { profile, demoCode })
    try {
      const r = await fetch('/api/dukaan-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw Object.assign(new Error(d.error || `Server error (${r.status})`), { status: r.status })
      setMessages((m) => [...m, { id: newId(), role: 'assistant', content: d.reply, order: d.order ?? null }])
      if (d.order) onOrder?.(d.order)
    } catch (err) {
      const msg = err.name === 'TimeoutError' ? 'Jawab aane mein bahut der lagi.' : err.message || 'Network nahi mila.'
      // 400/403 in demo mode mean the setup (name, demo code) needs fixing; anything else is worth a retry.
      const fixInSetup = !shopId && (err.status === 400 || err.status === 403)
      setMessages((m) => [...m, { id: newId(), role: 'assistant', error: true, content: msg, retry: clean, fixInSetup }])
    } finally {
      setSending(false)
    }
  }

  function retry(msg) {
    // Drop the failed customer message and the error, then send it again.
    const i = messages.findIndex((m) => m.id === msg.id)
    send(msg.retry, messages.slice(0, Math.max(0, i - 1)))
  }

  // English demos (the ones sent to LinkedIn/Upwork clients) get English buttons and notes.
  const english = profile.language === 'english'
  const quick = english ? TYPES[profile.type].quickEn : TYPES[profile.type].quick
  return (
    <>
      <main className="ds-chat">
        {shopId && (
          <div className="ds-note">{english ? `🤖 This is ${profile.name}'s AI assistant. If anything looks wrong, please call the business.` : `🤖 Ye ${profile.name} ka AI assistant hai. Kuch galat lage to dukaan pe call karein.`}</div>
        )}
        {fromLink && !shopId && (
          <div className="ds-note">
            {english
              ? <>👋 A demo AI assistant for <b>{profile.name}</b>. Chat as a customer: ask about prices or timings, or place a test order.</>
              : <>👋 Ye <b>{profile.name}</b> ka AI assistant hai (demo). Customer ban ke kuch bhi poochiye - rate, timing, ya order karke dekhiye.</>}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`ds-row ${m.role}`}>
            <div className={`ds-bubble ${m.error ? 'error' : ''}`}>
              {m.error ? (
                <>
                  <span>⚠️ {m.content}</span>
                  {m.fixInSetup ? (
                    <button className="ds-link" onClick={onSetup}>Setup kholo</button>
                  ) : (
                    <button className="ds-link" onClick={() => retry(m)}>Phir se bhejo</button>
                  )}
                </>
              ) : (
                <RichText text={m.content} />
              )}
            </div>
            {m.order && <OrderCard order={m.order} demo={!shopId} />}
          </div>
        ))}
        {sending && (
          <div className="ds-row assistant">
            <div className="ds-bubble ds-typing" aria-label="typing"><i /><i /><i /></div>
          </div>
        )}
      </main>
      <div className="ds-composer">
        {!sending && (
          <div className="ds-quick">
            {quick.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send(input) }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={english ? 'Type a message…' : 'Message likhiye…'}
            maxLength={800}
            aria-label="Message"
            enterKeyHint="send"
          />
          <button type="submit" disabled={sending || !input.trim()} aria-label="Send">➤</button>
        </form>
      </div>
    </>
  )
}

// Plain text with line breaks, **bold**, and tappable phone numbers.
function RichText({ text }) {
  return text.split('\n').map((line, i) => (
    <p key={i}>
      {line.split(/(\*\*[^*]+\*\*|(?:\+91[\s-]?)?\b\d[\d\s-]{8,13}\d\b)/g).map((part, j) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={j}>{part.slice(2, -2)}</strong>
        const digits = part.replace(/\D/g, '')
        if (digits.length >= 10 && digits.length <= 12 && /^[\d\s+-]+$/.test(part)) return <a key={j} href={`tel:${digits}`}>{part}</a>
        return part
      })}
    </p>
  ))
}

function OrderCard({ order, demo }) {
  return (
    <div className="ds-order">
      <div className="ds-order-head">
        <b>{order.kind === 'booking' ? '📅 Booking' : '🛍️ Order'} #{order.id}</b>
        <span>{order.notified ? 'Owner ko bhej diya ✅' : demo ? 'Orders tab mein ✅' : 'Owner tak pahuncha ✅'}</span>
      </div>
      <ul>
        {order.items.map((it, i) => (
          <li key={i}><span>{it.qty} × {it.name}</span>{it.price > 0 && <span>{rupees(it.qty * it.price)}</span>}</li>
        ))}
      </ul>
      {order.total > 0 && <div className="ds-order-total"><span>Total</span><b>{rupees(order.total)}</b></div>}
      <div className="ds-order-meta">
        {order.customer_name} · {order.phone}
        {order.slot && <> · 🕒 {order.slot}</>}
        {order.address && <> · 📍 {order.address}</>}
      </div>
    </div>
  )
}

// ---------- SETUP ----------

function Setup({ profile, demoCode, onDemoCode, onSave, toast }) {
  const [form, setForm] = useState(profile)
  const t = TYPES[form.type]
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function applyTemplate(type) {
    // Ask first only when the form holds the user's own edits, not an untouched sample.
    const current = JSON.stringify(normalizeProfile(form))
    const untouched = Object.values(TEMPLATES).some((tp) => JSON.stringify(normalizeProfile(tp)) === current)
    if (!untouched && !confirm(`${TYPES[type].label} ka sample bharein? Abhi ki details hat jayengi.`)) return
    setForm(normalizeProfile(TEMPLATES[type]))
  }

  function changeType(e) {
    const type = e.target.value
    setForm((f) => ({ ...f, type, kind: TYPES[type].kind }))
  }

  function save(e) {
    e.preventDefault()
    const p = normalizeProfile(form)
    if (!p) return toast('Dukaan ka naam likho')
    onSave(p)
  }

  async function copy(text, done) {
    try {
      await navigator.clipboard.writeText(text)
      toast(done)
    } catch {
      prompt('Copy karo:', text)
    }
  }

  const saved = normalizeProfile(form)
  const linkPayload = () => (demoCode ? { ...saved, c: demoCode } : saved)
  const pitch = (link) =>
    `Namaste! 🙏 Maine ${saved.name} ke liye ek AI assistant banaya hai. Ye customers ke sawal ka jawab deta hai (rate, timing, menu) aur ${saved.kind === 'booking' ? 'booking' : 'order'} leke seedha aapke phone pe bhejta hai - 24 ghante, bina staff ke.\n\nEk baar customer ban ke try kijiye: ${link}`

  async function share() {
    if (!saved) return toast('Pehle dukaan ka naam likho')
    const link = await demoLink(linkPayload())
    if (navigator.share) {
      try {
        await navigator.share({ title: saved.name, text: pitch(link) })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }
    copy(pitch(link), 'Message + link copy ho gaya 📋')
  }

  async function whatsapp() {
    if (!saved) return toast('Pehle dukaan ka naam likho')
    const link = await demoLink(linkPayload())
    window.location.assign(`https://wa.me/?text=${encodeURIComponent(pitch(link))}`)
  }

  const count = (key) => <small className="ds-count">{form[key].length}/{LIMITS[key]}</small>

  return (
    <main className="ds-setup">
      <section>
        <h2>1. Sample chuno</h2>
        <div className="ds-chips">
          {Object.keys(TEMPLATES).map((type) => (
            <button key={type} type="button" className={form.type === type ? 'on' : ''} onClick={() => applyTemplate(type)}>
              {TYPES[type].emoji} {TYPES[type].label}
            </button>
          ))}
        </div>
      </section>

      <form onSubmit={save}>
        <section>
          <h2>2. Dukaan ki details</h2>
          <label>Dukaan ka naam *<input value={form.name} onChange={set('name')} maxLength={LIMITS.name} required /></label>
          <div className="ds-grid">
            <label>Business type
              <select value={form.type} onChange={changeType}>
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </label>
            <label>Bot kya lega?
              <select value={form.kind} onChange={set('kind')}>
                <option value="order">🛍️ Order</option>
                <option value="booking">📅 Appointment / booking</option>
              </select>
            </label>
          </div>
          <div className="ds-grid">
            <label>Shehar<input value={form.city} onChange={set('city')} maxLength={LIMITS.city} /></label>
            <label>Phone<input value={form.phone} onChange={set('phone')} maxLength={LIMITS.phone} inputMode="tel" /></label>
          </div>
          <label>Address<input value={form.address} onChange={set('address')} maxLength={LIMITS.address} /></label>
          <label>Timing<input value={form.timings} onChange={set('timings')} maxLength={LIMITS.timings} placeholder="Roz 10 AM - 9 PM, Monday band" /></label>
          <label>{t.catalogLabel} {count('catalog')}
            <textarea rows={8} value={form.catalog} onChange={set('catalog')} maxLength={LIMITS.catalog} placeholder={'Dal Makhani - 180\nButter Naan - 40'} />
          </label>
          <label>Baaki jaankari (delivery, payment, offers, rules) {count('info')}
            <textarea rows={5} value={form.info} onChange={set('info')} maxLength={LIMITS.info} />
          </label>
          <div className="ds-grid">
            <label>Bot ki bhasha
              <select value={form.language} onChange={set('language')}>
                {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
          </div>
          <label>Pehla message (khaali chhodo to apne aap banega)
            <input value={form.greeting} onChange={set('greeting')} maxLength={LIMITS.greeting} placeholder={saved ? greetingFor({ ...saved, greeting: '' }) : ''} />
          </label>
        </section>
        <button className="ds-btn wide" type="submit">✅ Save karke chat try karo</button>
      </form>

      <section>
        <h2>3. Dukaan wale ko demo bhejo</h2>
        <p className="ds-help">Link mein upar wali saari details hoti hain - dukaan wala usko khol ke apna bot khud try kar sakta hai. Koi database nahi chahiye.</p>
        <div className="ds-actions">
          <button className="ds-btn" type="button" onClick={whatsapp}>🟢 WhatsApp pe bhejo</button>
          <button className="ds-btn ghost" type="button" onClick={share}>📤 Share / copy</button>
        </div>
      </section>

      <details className="ds-advanced">
        <summary>Advanced</summary>
        <label>Demo code (agar Vercel mein DUKAAN_DEMO_CODE lagaya hai)
          <input value={demoCode} onChange={(e) => onDemoCode(e.target.value.trim())} autoComplete="off" />
        </label>
        <p className="ds-help">Client ne haan bol diya? Profile copy karke <code>api/_dukaan/shops.js</code> mein daalo - phir uska pakka link <code>/dukaan/?shop=id</code> ban jaata hai (DUKAAN.md dekho).</p>
        <button className="ds-btn ghost" type="button" onClick={() => saved && copy(JSON.stringify(saved, null, 2), 'Profile copy ho gaya 📋')}>📋 Profile copy karo</button>
      </details>
    </main>
  )
}

// ---------- ORDERS ----------

function Orders({ orders, onChange, onChat }) {
  if (!orders.length) {
    return (
      <main className="ds-orders ds-center">
        <div className="ds-empty">
          <div className="ds-empty-emoji">🧾</div>
          <p>Abhi koi order nahi.<br />Chat mein customer ban ke order karke dekho.</p>
          <button className="ds-btn" onClick={onChat}>💬 Chat kholo</button>
        </div>
      </main>
    )
  }
  const toggle = (order) => onChange(orders.map((o) => (o === order ? { ...o, done: !o.done } : o)))
  return (
    <main className="ds-orders">
      <p className="ds-help">Demo orders sirf is phone mein save hote hain. Asli setup mein har order dukaan wale ke Telegram pe turant jaata hai.</p>
      {orders.map((o) => (
        <div key={o.id + o.createdAt} className={`ds-order big ${o.done ? 'done' : ''}`}>
          <div className="ds-order-head">
            <b>#{o.id} · {o.shop}</b>
            <span>{new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <ul>
            {o.items.map((it, i) => (
              <li key={i}><span>{it.qty} × {it.name}</span>{it.price > 0 && <span>{rupees(it.qty * it.price)}</span>}</li>
            ))}
          </ul>
          {o.total > 0 && <div className="ds-order-total"><span>Total</span><b>{rupees(o.total)}</b></div>}
          <div className="ds-order-meta">
            👤 {o.customer_name} · <a href={`tel:${o.phone.replace(/\D/g, '')}`}>📞 {o.phone}</a>
            {o.slot && <div>🕒 {o.slot}</div>}
            {o.address && <div>📍 {o.address}</div>}
            {o.notes && <div>📝 {o.notes}</div>}
          </div>
          <button className="ds-btn ghost small" onClick={() => toggle(o)}>{o.done ? '↩️ Wapas kholo' : '✔️ Ho gaya'}</button>
        </div>
      ))}
      <button className="ds-btn ghost wide" onClick={() => confirm('Saare demo orders hata dein?') && onChange([])}>🗑️ Sab hatao</button>
    </main>
  )
}
