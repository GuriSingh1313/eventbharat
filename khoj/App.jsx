// ============================================
// Client Khoj - LinkedIn par client dhoondhne ka assistant
// Search links open LinkedIn; you paste a post, AI checks the lead and drafts messages,
// you send them yourself, and the tracker reminds you about follow-ups.
// Nothing here logs in to LinkedIn or sends anything on its own.
// ============================================

import { useEffect, useState } from 'react'
import { FILTERS, STATUSES, daysSince, findDuplicate, isFollowUpDue, makeLead, markFollowedUp, markSent, sentToday, workOrder } from './lib/leads.js'
import { PERIODS, POST_PRESETS, googlePostsUrl, localPresets, peopleSearchUrl, postSearchUrl } from './lib/search.js'
import { DAILY_STEPS, SETUP_STEPS, kitSections } from './lib/kit.js'

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
      // storage full or blocked
    }
  },
}

const DEFAULT_ME = {
  name: '',
  offer: 'I build AI chat assistants for small businesses that answer customer questions and take orders or bookings 24x7, on WhatsApp or their website. I also build React websites and simple automations.',
  demoLink: `${location.origin}/dukaan/`,
  portfolio: '',
  language: 'english',
  city: 'Ludhiana',
  target: 15,
}

const FIT = { hot: '🔥 Hot', warm: '🙂 Warm', cold: '🧊 Cold' }
const DRAFT_FIELDS = [
  ['connection_note', 'Connection note', 300],
  ['message', 'Message (connect hone ke baad)', 700],
  ['comment', 'Post pe comment', 300],
  ['follow_up', 'Follow-up (3 din baad)', 300],
]

// Current time, refreshed every minute so "aaj" counts and follow-up reminders stay current.
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

async function api(body) {
  const r = await fetch('/api/lead-draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(d.error || `Server error (${r.status})`), { status: r.status })
  return d
}

export default function App() {
  const [code, setCode] = useState(() => store.get('khoj_code', ''))
  const [me, setMe] = useState(() => ({ ...DEFAULT_ME, ...store.get('khoj_me', {}) }))
  const [leads, setLeads] = useState(() => store.get('khoj_leads', []))
  const [tab, setTab] = useState(() => (store.get('khoj_me', {}).name ? 'find' : 'settings'))
  const [toast, setToast] = useState('')
  const now = useNow()

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }
  function saveLeads(next) {
    setLeads(next)
    store.set('khoj_leads', next)
  }
  function saveMe(next) {
    setMe(next)
    store.set('khoj_me', next)
  }
  function logout() {
    setCode('')
    store.set('khoj_code', '')
  }

  if (!code) return <CodeGate onOk={(c) => { setCode(c); store.set('khoj_code', c) }} />

  const todo = leads.filter((l) => FILTERS.todo.test(l, now)).length
  return (
    <div className="kh-app">
      {toast && <div className="kh-toast" role="status">{toast}</div>}
      <header className="kh-header">
        <h1>🎯 Client Khoj</h1>
        <p>Aaj bheje: <b>{sentToday(leads, now)}</b> / {me.target}</p>
      </header>
      <nav className="kh-tabs" aria-label="Sections">
        <button className={tab === 'find' ? 'on' : ''} onClick={() => setTab('find')}>🔍 Dhoondho</button>
        <button className={tab === 'leads' ? 'on' : ''} onClick={() => setTab('leads')}>
          📋 Leads{todo > 0 && <span className="kh-badge">{todo}</span>}
        </button>
        <button className={tab === 'kit' ? 'on' : ''} onClick={() => setTab('kit')}>🧰 Kit</button>
        <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>⚙️ Settings</button>
      </nav>
      {tab === 'find' && (
        <Find
          me={me}
          code={code}
          leads={leads}
          onSave={(lead) => { saveLeads([lead, ...leads]); showToast('Leads mein save ho gaya ✅') }}
          onBadCode={logout}
          onSettings={() => setTab('settings')}
          toast={showToast}
        />
      )}
      {tab === 'leads' && <Leads leads={leads} me={me} now={now} onChange={saveLeads} toast={showToast} onFind={() => setTab('find')} />}
      {tab === 'kit' && <Kit me={me} toast={showToast} />}
      {tab === 'settings' && (
        <Settings
          me={me}
          // First save goes to the Kit's one-time setup checklist; later saves go back to searching.
          onSave={(m) => { const first = !me.name; saveMe(m); showToast('Save ho gaya ✅'); setTab(first ? 'kit' : 'find') }}
          leads={leads}
          onLeads={saveLeads}
          onLogout={logout}
          toast={showToast}
        />
      )}
    </div>
  )
}

function CodeGate({ onOk }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api({ code: value.trim(), check: true })
      onOk(value.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="kh-app kh-center">
      <form className="kh-card kh-gate" onSubmit={submit}>
        <div className="kh-gate-emoji">🎯</div>
        <h1>Client Khoj</h1>
        <p className="kh-help">Access code daalo (jo Vercel mein <code>LEADS_CODE</code> rakha hai).</p>
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Access code" aria-label="Access code" autoFocus />
        {error && <p className="kh-error">⚠️ {error}</p>}
        <button className="kh-btn wide" disabled={busy || !value.trim()}>{busy ? 'Check ho raha hai…' : 'Kholo'}</button>
      </form>
    </div>
  )
}

async function copyText(text, toast) {
  try {
    await navigator.clipboard.writeText(text)
    toast('Copy ho gaya 📋 Ab paste karo')
  } catch {
    prompt('Copy karo:', text)
  }
}

// ---------- FIND ----------

function Find({ me, code, leads, onSave, onBadCode, onSettings, toast }) {
  const [period, setPeriod] = useState('past-24h')
  const [custom, setCustom] = useState('')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const duplicate = findDuplicate(leads, url.trim())

  async function draft(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const { draft } = await api({ code, me, lead: { text, url: url.trim() } })
      setResult(draft)
    } catch (err) {
      if (err.status === 401) return onBadCode()
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function save(sent) {
    let lead = makeLead(result, { url: url.trim(), text })
    if (sent) lead = markSent(lead)
    onSave(lead)
    setResult(null)
    setUrl('')
    setText('')
  }

  return (
    <main className="kh-main">
      <section className="kh-card">
        <h2>1. LinkedIn pe dhoondho</h2>
        <div className="kh-chips" role="group" aria-label="Kab ki posts">
          {Object.entries(PERIODS).map(([k, v]) => (
            <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{v}</button>
          ))}
        </div>
        <p className="kh-label">Jo abhi developer dhoondh rahe hain (posts)</p>
        <div className="kh-links">
          {POST_PRESETS.map((p) => <a key={p.label} href={postSearchUrl(p.q, period)} target="_blank" rel="noreferrer">{p.label} ↗</a>)}
        </div>
        <p className="kh-label">Business owners · {me.city} (log)</p>
        <div className="kh-links">
          {localPresets(me.city).map((p) => <a key={p.label} href={peopleSearchUrl(p.q)} target="_blank" rel="noreferrer">{p.label} ↗</a>)}
        </div>
        <div className="kh-row">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder='Apna search, jaise "need a chatbot"' aria-label="Apna search" />
        </div>
        {custom.trim() && (
          <div className="kh-links">
            <a href={postSearchUrl(custom.trim(), period)} target="_blank" rel="noreferrer">Posts ↗</a>
            <a href={peopleSearchUrl(custom.trim())} target="_blank" rel="noreferrer">Log ↗</a>
            <a href={googlePostsUrl(custom.trim(), period)} target="_blank" rel="noreferrer">Google se ↗</a>
          </div>
        )}
      </section>

      <form className="kh-card" onSubmit={draft}>
        <h2>2. Kaam ki post mili? Yahan paste karo</h2>
        <p className="kh-help">LinkedIn pe post ya profile ka text copy karo (naam, headline, post). Link bhi daal do taaki baad mein seedha khul sake.</p>
        <label>Link (optional)<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/posts/…" inputMode="url" /></label>
        {duplicate && <p className="kh-warn">⚠️ Ye lead pehle se save hai ({STATUSES[duplicate.status].label}).</p>}
        <label>Post / profile ka text<textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Simran Kaur · Owner, Sweet Crumbs Bakery&#10;Looking for someone to build a WhatsApp ordering bot…" /></label>
        {!me.name && <p className="kh-warn">Pehle <button type="button" className="kh-link" onClick={onSettings}>Settings</button> mein apna naam bharo.</p>}
        <button className="kh-btn wide" disabled={busy || text.trim().length < 20 || !me.name}>{busy ? '🤖 Soch raha hai…' : '🤖 Check karo + message likho'}</button>
        {error && <p className="kh-error">⚠️ {error}</p>}
      </form>

      {result && (
        <section className="kh-card kh-result">
          <LeadSummary lead={result} />
          <Drafts drafts={result} onChange={(key, v) => setResult({ ...result, [key]: v })} toast={toast} />
          <div className="kh-actions">
            <button className="kh-btn" onClick={() => save(true)}>✅ Bhej diya · save</button>
            <button className="kh-btn ghost" onClick={() => save(false)}>💾 Baad mein bhejunga</button>
            <button className="kh-btn ghost" onClick={() => setResult(null)}>✖️ Chhodo</button>
          </div>
        </section>
      )}
    </main>
  )
}

function LeadSummary({ lead }) {
  return (
    <div className="kh-summary">
      <div className="kh-summary-top">
        <span className={`kh-fit ${lead.fit}`}>{FIT[lead.fit]}</span>
        <b>{lead.person || 'Naam nahi mila'}</b>
      </div>
      {lead.headline && <p className="kh-muted">{lead.headline}</p>}
      {lead.need && <p>🎯 {lead.need}</p>}
      {lead.reason && <p className="kh-muted">{lead.reason}</p>}
    </div>
  )
}

function Drafts({ drafts, onChange, toast, only }) {
  return DRAFT_FIELDS.filter(([key]) => (only ? only.includes(key) : drafts[key])).map(([key, label, max]) => (
    <div key={key} className="kh-draft">
      <div className="kh-draft-head">
        <span>{label}</span>
        <small className={drafts[key].length > max ? 'over' : ''}>{drafts[key].length}/{max}</small>
      </div>
      <textarea rows={key === 'message' ? 5 : 3} value={drafts[key]} onChange={(e) => onChange(key, e.target.value)} aria-label={label} />
      <button className="kh-btn small" onClick={() => copyText(drafts[key], toast)}>📋 Copy</button>
    </div>
  ))
}

// ---------- LEADS ----------

function Leads({ leads, me, now, onChange, toast, onFind }) {
  const [filter, setFilter] = useState('todo')
  const [open, setOpen] = useState(null)
  const shown = workOrder(leads, now).filter((l) => FILTERS[filter].test(l, now))
  const due = leads.filter((l) => isFollowUpDue(l, now)).length
  const sent = sentToday(leads, now)
  const update = (lead) => onChange(leads.map((l) => (l.id === lead.id ? lead : l)))

  return (
    <main className="kh-main">
      <section className="kh-card kh-today">
        <div className="kh-progress" role="progressbar" aria-valuenow={sent} aria-valuemax={me.target}>
          <i style={{ width: `${Math.min(100, (sent / Math.max(1, me.target)) * 100)}%` }} />
        </div>
        <p><b>{sent}</b>/{me.target} aaj bheje · <b>{due}</b> follow-up due · <b>{leads.filter((l) => l.status === 'won').length}</b> clients</p>
      </section>
      <div className="kh-chips">
        {Object.entries(FILTERS).map(([k, f]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{f.label}</button>
        ))}
      </div>
      {!shown.length && (
        <div className="kh-empty">
          <p>{leads.length ? 'Is list mein abhi kuch nahi.' : 'Abhi koi lead nahi. Dhoondho tab se shuru karo.'}</p>
          {!leads.length && <button className="kh-btn" onClick={onFind}>🔍 Dhoondho</button>}
        </div>
      )}
      {shown.map((l) => (
        <LeadCard key={l.id} lead={l} now={now} open={open === l.id} onToggle={() => setOpen(open === l.id ? null : l.id)} onChange={update}
          onDelete={() => confirm('Ye lead hata dein?') && onChange(leads.filter((x) => x.id !== l.id))} toast={toast} />
      ))}
      <p className="kh-help center">Leads sirf is phone mein save hain. Settings se backup le lo.</p>
    </main>
  )
}

function ago(t, now) {
  const d = daysSince(t, now)
  return d <= 0 ? 'aaj' : d === 1 ? 'kal' : `${d} din pehle`
}

function LeadCard({ lead, now, open, onToggle, onChange, onDelete, toast }) {
  const due = isFollowUpDue(lead, now)
  const setDraft = (key, v) => onChange({ ...lead, drafts: { ...lead.drafts, [key]: v } })
  const when = lead.sentAt ? `${ago(lead.sentAt, now)} bheja` : `${ago(lead.createdAt, now)} mila`
  return (
    <article className={`kh-card kh-lead ${due ? 'due' : ''} ${lead.status === 'lost' ? 'dim' : ''}`}>
      <button className="kh-lead-head" onClick={onToggle} aria-expanded={open}>
        <span className={`kh-fit ${lead.fit}`}>{FIT[lead.fit]}</span>
        <span className="kh-lead-name">
          <b>{lead.person || 'Bina naam'}</b>
          <small>{lead.headline || lead.need}</small>
        </span>
        <span className="kh-lead-status">
          {due ? <em>⏰ Follow-up</em> : <>{STATUSES[lead.status].emoji} {STATUSES[lead.status].label}</>}
          <small>{when}</small>
        </span>
      </button>
      {open && (
        <div className="kh-lead-body">
          {lead.need && <p>🎯 {lead.need}</p>}
          {lead.url && <a className="kh-btn ghost small" href={lead.url} target="_blank" rel="noreferrer">🔗 LinkedIn pe kholo</a>}
          <Drafts
            drafts={lead.drafts}
            onChange={setDraft}
            toast={toast}
            only={lead.status === 'new' ? ['connection_note', 'message', 'comment'].filter((k) => lead.drafts[k]) : ['follow_up', 'message']}
          />
          <div className="kh-actions">
            {lead.status === 'new' && <button className="kh-btn" onClick={() => onChange(markSent(lead))}>✅ Bhej diya</button>}
            {due && <button className="kh-btn" onClick={() => onChange(markFollowedUp(lead))}>✅ Follow-up bhej diya</button>}
            <select value={lead.status} onChange={(e) => onChange({ ...lead, status: e.target.value, sentAt: lead.sentAt ?? (e.target.value !== 'new' ? Date.now() : null) })} aria-label="Status">
              {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.emoji} {s.label}</option>)}
            </select>
          </div>
          <label className="kh-notes">Notes<textarea rows={2} value={lead.notes} onChange={(e) => onChange({ ...lead, notes: e.target.value })} placeholder="Budget, call ka time, kya bola…" /></label>
          <button className="kh-link danger" onClick={onDelete}>🗑️ Hatao</button>
        </div>
      )}
    </article>
  )
}

// ---------- KIT ----------

function Kit({ me, toast }) {
  const [done, setDone] = useState(() => store.get('khoj_kit_done', {}))
  const toggle = (id) => {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    store.set('khoj_kit_done', next)
  }
  const finished = SETUP_STEPS.filter((s) => done[s.id]).length
  return (
    <main className="kh-main">
      <section className="kh-card">
        <h2>Ek baar ka setup ({finished}/{SETUP_STEPS.length})</h2>
        <p className="kh-help">Bas itna karna hai. Har kaam ke baad ✔ lagao. Text neeche Copy buttons mein tayyar hai.</p>
        {SETUP_STEPS.map((s) => (
          <label key={s.id} className={`kh-check ${done[s.id] ? 'done' : ''}`}>
            <input type="checkbox" checked={!!done[s.id]} onChange={() => toggle(s.id)} />
            <span>{s.text}</span>
          </label>
        ))}
        <div className="kh-actions">
          <a className="kh-btn ghost small" href="/work/" target="_blank" rel="noreferrer">👀 Mera portfolio</a>
          <a className="kh-btn ghost small" href="/dukaan/?shop=sharma-dhaba" target="_blank" rel="noreferrer">💬 Demo bot</a>
        </div>
      </section>

      <section className="kh-card">
        <h2>Roz ka kaam (30-40 minute)</h2>
        <ol className="kh-daily">{DAILY_STEPS.map((t) => <li key={t}>{t}</li>)}</ol>
      </section>

      {kitSections(me.name || 'Guri', location.origin).map((sec) => (
        <section className="kh-card" key={sec.title}>
          <h2>{sec.title}</h2>
          <p className="kh-help">{sec.help}</p>
          {sec.items.map((it) => (
            <div className="kh-draft" key={it.label}>
              <div className="kh-draft-head">
                <span>{it.label}</span>
                {it.max && <small>{it.text.length}/{it.max}</small>}
              </div>
              <p className="kh-kit-text">{it.text}</p>
              <button className="kh-btn small" onClick={() => copyText(it.text, toast)}>📋 Copy</button>
            </div>
          ))}
        </section>
      ))}
    </main>
  )
}

// ---------- SETTINGS ----------

function Settings({ me, onSave, leads, onLeads, onLogout, toast }) {
  const [form, setForm] = useState(me)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function save(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.offer.trim()) return toast('Naam aur "main kya karta hoon" zaroori hai')
    onSave({ ...form, name: form.name.trim(), city: form.city.trim() || 'Ludhiana', target: Math.max(1, Math.min(100, Number(form.target) || 15)) })
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ me, leads }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `client-khoj-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function importBackup(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const incoming = Array.isArray(data.leads) ? data.leads.filter((l) => l && l.id && l.drafts) : []
      const have = new Set(leads.map((l) => l.id))
      const added = incoming.filter((l) => !have.has(l.id))
      onLeads([...added, ...leads])
      toast(`${added.length} leads wapas aa gaye ✅`)
    } catch {
      toast('Ye backup file sahi nahi hai')
    }
  }

  return (
    <main className="kh-main">
      <form className="kh-card" onSubmit={save}>
        <h2>Meri details</h2>
        <p className="kh-help">AI inhi se message likhta hai. Sirf is phone mein save hoti hain.</p>
        <label>Mera naam *<input value={form.name} onChange={set('name')} maxLength={80} placeholder="Guri Singh" /></label>
        <label>Main kya kaam karta hoon *<textarea rows={4} value={form.offer} onChange={set('offer')} maxLength={800} /></label>
        <label>Demo link<input value={form.demoLink} onChange={set('demoLink')} maxLength={300} inputMode="url" /></label>
        <label>Portfolio / GitHub (optional)<input value={form.portfolio} onChange={set('portfolio')} maxLength={300} inputMode="url" /></label>
        <div className="kh-grid">
          <label>Message ki bhasha
            <select value={form.language} onChange={set('language')}>
              <option value="english">English</option>
              <option value="hinglish">Hinglish</option>
              <option value="hindi">हिन्दी</option>
            </select>
          </label>
          <label>Roz ka target<input type="number" min={1} max={100} value={form.target} onChange={set('target')} inputMode="numeric" /></label>
        </div>
        <label>Mera shehar (local search ke liye)<input value={form.city} onChange={set('city')} maxLength={40} /></label>
        <button className="kh-btn wide">✅ Save</button>
      </form>

      <section className="kh-card">
        <h2>Backup</h2>
        <p className="kh-help">Leads sirf is browser mein hain. Phone badalne se pehle backup download karo, naye phone pe wapas daalo.</p>
        <div className="kh-actions">
          <button className="kh-btn ghost" onClick={exportBackup}>⬇️ Backup download</button>
          <label className="kh-btn ghost kh-file">⬆️ Backup wapas daalo<input type="file" accept="application/json,.json" onChange={importBackup} /></label>
        </div>
      </section>

      <section className="kh-card">
        <h2>Account</h2>
        <div className="kh-actions">
          <button className="kh-btn ghost" onClick={onLogout}>🔒 Code badlo / logout</button>
          <button className="kh-btn ghost danger" onClick={() => confirm(`Saare ${leads.length} leads hamesha ke liye hata dein?`) && onLeads([])}>🗑️ Saare leads hatao</button>
        </div>
      </section>
    </main>
  )
}
