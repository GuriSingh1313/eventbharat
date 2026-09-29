// ============================================
// Client Khoj - LinkedIn / Upwork par client dhoondhne ka assistant
// Paste a post: AI checks the lead, builds a personal demo of their business and drafts the messages.
// You send them yourself; the tracker handles follow-ups and the reply coach writes the next message.
// Nothing here logs in to LinkedIn or sends anything on its own.
// ============================================

import { useEffect, useState } from 'react'
import { FILTERS, STATUSES, addToThread, daysSince, findDuplicate, isFollowUpDue, makeLead, markFollowedUp, markSent, sentToday, workOrder } from './lib/leads.js'
import { PERIODS, POST_PRESETS, SIGNAL_PRESETS, UPWORK_PRESETS, googlePostsUrl, localPresets, peopleSearchUrl, postSearchUrl, upworkSearchUrl } from './lib/search.js'
import { SOURCES, applyDemoLink, buildClaudeAppPrompt, buildProjectBrief } from './lib/prompt.js'
import { demoProfile } from './lib/demo.js'
import { demoLink } from '../dukaan/lib/link.js'
import { DAILY_STEPS, RULES, SETUP_STEPS, kitSections } from './lib/kit.js'

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
// Which drafts to show per source, main one first: [key, label, max characters]. The message max leaves room for the demo link.
const DRAFT_FIELDS = {
  linkedin: [
    ['message', 'Message (connect hone ke baad) · demo link isme hai', 2500],
    ['connection_note', 'Connection note (sirf hot lead ke liye)', 200],
    ['comment', 'Post pe comment (pehle ye karo)', 300],
    ['follow_up', 'Follow-up (3 din baad)', 300],
  ],
  upwork: [
    ['message', 'Proposal', 2500],
    ['follow_up', 'Follow-up (2 din baad)', 300],
  ],
  other: [
    ['message', 'Message', 2500],
    ['comment', 'Comment', 300],
    ['follow_up', 'Follow-up (3 din baad)', 300],
  ],
}

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
      {tab === 'leads' && <Leads leads={leads} me={me} code={code} now={now} onChange={saveLeads} onBadCode={logout} toast={showToast} onFind={() => setTab('find')} />}
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
      // Business lead: build its personal demo and put the link into the drafts.
      const profile = demoProfile(draft.demo, me.language)
      const link = profile ? await demoLink(profile) : ''
      setResult({ ...applyDemoLink(draft, link), demoLink: link, demoName: profile?.name ?? '' })
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
      <form className="kh-card" onSubmit={draft}>
        <h2>Post ya job yahan paste karo</h2>
        <p className="kh-help">LinkedIn post / profile, Upwork job, kuch bhi. AI batayega kaam ka hai ya nahi, uske business ka demo banayega, aur message likh dega.</p>
        <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} aria-label="Post / profile ka text"
          placeholder={'Simran Kaur · Owner, Sweet Crumbs Bakery\nLooking for someone to build a WhatsApp ordering bot…'} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" inputMode="url" aria-label="Link (optional)" />
        {duplicate && <p className="kh-warn">⚠️ Ye lead pehle se save hai ({STATUSES[duplicate.status].label}).</p>}
        {!me.name && <p className="kh-warn">Pehle <button type="button" className="kh-link" onClick={onSettings}>Settings</button> mein apna naam bharo.</p>}
        <button className="kh-btn wide big" disabled={busy || text.trim().length < 20 || !me.name}>{busy ? '🤖 Demo + message ban raha hai…' : '🤖 Demo + message banao'}</button>
        {error && <p className="kh-error">⚠️ {error}</p>}
        <button type="button" className="kh-link small" disabled={text.trim().length < 20}
          onClick={() => copyText(buildClaudeAppPrompt(me, { text, url: url.trim() }), toast)}>
          Paise nahi lagane? Claude app ke liye copy karo (demo nahi banega)
        </button>
      </form>

      {result && (
        <section className="kh-card kh-result">
          <LeadSummary lead={result} />
          {result.demoLink && <DemoCard name={result.demoName} link={result.demoLink} toast={toast} />}
          <Drafts source={result.source} drafts={result} onChange={(key, v) => setResult({ ...result, [key]: v })} toast={toast} />
          <div className="kh-actions">
            <button className="kh-btn" onClick={() => save(true)}>✅ Bhej diya · save</button>
            <button className="kh-btn ghost" onClick={() => save(false)}>💾 Baad mein</button>
            <button className="kh-btn ghost" onClick={() => setResult(null)}>✖️ Chhodo</button>
          </div>
        </section>
      )}

      <details className="kh-card kh-find">
        <summary>🔍 Leads kahan milenge? (search buttons)</summary>
        <div className="kh-chips" role="group" aria-label="Kab ki posts">
          {Object.entries(PERIODS).map(([k, v]) => (
            <button key={k} type="button" className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{v}</button>
          ))}
        </div>
        <p className="kh-label">LinkedIn: jinhe abhi chahiye</p>
        <div className="kh-links">
          {POST_PRESETS.map((p) => <a key={p.label} href={postSearchUrl(p.q, period)} target="_blank" rel="noreferrer">{p.label} ↗</a>)}
        </div>
        <p className="kh-label">LinkedIn: chhupe hue leads (staff hire kar rahe hain)</p>
        <div className="kh-links">
          {SIGNAL_PRESETS.map((p) => <a key={p.label} href={postSearchUrl(p.q, period)} target="_blank" rel="noreferrer">{p.label} ↗</a>)}
          {localPresets(me.city).map((p) => <a key={p.label} href={peopleSearchUrl(p.q)} target="_blank" rel="noreferrer">{p.label} ↗</a>)}
        </div>
        <p className="kh-label">Upwork: naye jobs</p>
        <div className="kh-links">
          {UPWORK_PRESETS.map((p) => <a key={p.label} href={upworkSearchUrl(p.q)} target="_blank" rel="noreferrer">{p.label} ↗</a>)}
        </div>
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder='Apna search, jaise "need a chatbot"' aria-label="Apna search" />
        {custom.trim() && (
          <div className="kh-links">
            <a href={postSearchUrl(custom.trim(), period)} target="_blank" rel="noreferrer">LinkedIn posts ↗</a>
            <a href={upworkSearchUrl(custom.trim())} target="_blank" rel="noreferrer">Upwork ↗</a>
            <a href={googlePostsUrl(custom.trim(), period)} target="_blank" rel="noreferrer">Google se ↗</a>
          </div>
        )}
      </details>
    </main>
  )
}

function LeadSummary({ lead }) {
  return (
    <div className="kh-summary">
      <div className="kh-summary-top">
        <span className={`kh-fit ${lead.fit}`}>{FIT[lead.fit]}</span>
        <b>{lead.person || 'Naam nahi mila'}</b>
        {lead.source && <small className="kh-source">{SOURCES[lead.source]?.label}</small>}
      </div>
      {lead.headline && <p className="kh-muted">{lead.headline}</p>}
      {lead.need && <p>🎯 {lead.need}</p>}
      {lead.reason && <p className="kh-muted">{lead.reason}</p>}
    </div>
  )
}

function DemoCard({ name, link, toast }) {
  return (
    <div className="kh-demo">
      <b>🎁 {name ? `${name} ka demo tayyar` : 'Personal demo tayyar'}</b>
      <p>Iska link message mein daal diya hai. Bhejne se pehle ek baar khol ke dekh lo.</p>
      <div className="kh-actions">
        <a className="kh-btn small" href={link} target="_blank" rel="noreferrer">👀 Demo kholo</a>
        <button className="kh-btn ghost small" onClick={() => copyText(link, toast)}>📋 Sirf link</button>
      </div>
    </div>
  )
}

function Drafts({ source = 'linkedin', drafts, onChange, toast, only }) {
  const fields = (DRAFT_FIELDS[source] ?? DRAFT_FIELDS.linkedin).filter(([key]) => (only ? only.includes(key) : drafts[key]))
  return fields.map(([key, label, max]) => (
    <div key={key} className="kh-draft">
      <div className="kh-draft-head">
        <span>{label}</span>
        <small className={drafts[key].length > max ? 'over' : ''}>{drafts[key].length}/{max}</small>
      </div>
      <textarea rows={key === 'message' ? 6 : 3} value={drafts[key]} onChange={(e) => onChange(key, e.target.value)} aria-label={label} />
      <button className="kh-btn small" onClick={() => copyText(drafts[key], toast)}>📋 Copy</button>
    </div>
  ))
}

// ---------- LEADS ----------

function Leads({ leads, me, code, now, onChange, onBadCode, toast, onFind }) {
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
        <LeadCard key={l.id} lead={l} me={me} code={code} now={now} open={open === l.id} onToggle={() => setOpen(open === l.id ? null : l.id)} onChange={update}
          onBadCode={onBadCode} onDelete={() => confirm('Ye lead hata dein?') && onChange(leads.filter((x) => x.id !== l.id))} toast={toast} />
      ))}
      <p className="kh-help center">Leads sirf is phone mein save hain. Settings se backup le lo.</p>
    </main>
  )
}

function ago(t, now) {
  const d = daysSince(t, now)
  return d <= 0 ? 'aaj' : d === 1 ? 'kal' : `${d} din pehle`
}

function LeadCard({ lead, me, code, now, open, onToggle, onChange, onBadCode, onDelete, toast }) {
  const due = isFollowUpDue(lead, now)
  const talking = ['sent', 'replied', 'call'].includes(lead.status)
  const setDraft = (key, v) => onChange({ ...lead, drafts: { ...lead.drafts, [key]: v } })
  const when = lead.sentAt ? `${ago(lead.sentAt, now)} bheja` : `${ago(lead.createdAt, now)} mila`
  const firstFields = lead.source === 'upwork' ? ['message'] : ['message', 'connection_note', 'comment']
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
          <div className="kh-actions">
            {lead.url && <a className="kh-btn ghost small" href={lead.url} target="_blank" rel="noreferrer">🔗 Post kholo</a>}
            {lead.demoLink && <a className="kh-btn ghost small" href={lead.demoLink} target="_blank" rel="noreferrer">🎁 Demo kholo</a>}
          </div>
          {lead.status === 'new' && (
            <>
              <Drafts source={lead.source} drafts={lead.drafts} onChange={setDraft} toast={toast} only={firstFields.filter((k) => lead.drafts[k])} />
              <button className="kh-btn" onClick={() => onChange(markSent(lead))}>✅ Bhej diya</button>
            </>
          )}
          {due && (
            <>
              <Drafts source={lead.source} drafts={lead.drafts} onChange={setDraft} toast={toast} only={['follow_up']} />
              <button className="kh-btn" onClick={() => onChange(markFollowedUp(lead))}>✅ Follow-up bhej diya</button>
            </>
          )}
          {talking && <ReplyCoach lead={lead} me={me} code={code} onChange={onChange} onBadCode={onBadCode} toast={toast} />}
          {lead.status === 'won' && (
            <div className="kh-demo">
              <b>🎉 Client mil gaya!</b>
              <p>Ye brief copy karke Claude ko bhejo. Wo sawal poochega, price batayega aur kaam bana dega.</p>
              <button className="kh-btn small" onClick={() => copyText(buildProjectBrief(lead, me), toast)}>📦 Claude ke liye brief copy karo</button>
            </div>
          )}
          <details className="kh-more">
            <summary>Aur (status, notes, hatao)</summary>
            <select value={lead.status} onChange={(e) => onChange({ ...lead, status: e.target.value, sentAt: lead.sentAt ?? (e.target.value !== 'new' ? Date.now() : null) })} aria-label="Status">
              {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.emoji} {s.label}</option>)}
            </select>
            <label className="kh-notes">Notes<textarea rows={2} value={lead.notes} onChange={(e) => onChange({ ...lead, notes: e.target.value })} placeholder="Budget, call ka time, kya bola…" /></label>
            <button className="kh-link danger" onClick={onDelete}>🗑️ Hatao</button>
          </details>
        </div>
      )}
    </article>
  )
}

// Paste the client's reply; AI writes the next message and says what to do next.
function ReplyCoach({ lead, me, code, onChange, onBadCode, toast }) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [coach, setCoach] = useState(null)

  async function ask() {
    setBusy(true)
    setError('')
    try {
      const { coach } = await api({ code, me, mode: 'reply', reply, lead: { text: lead.text, person: lead.person, need: lead.need, thread: lead.thread ?? [] } })
      setCoach(coach)
    } catch (err) {
      if (err.status === 401) return onBadCode()
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function sent() {
    let next = addToThread(lead, 'them', reply.trim())
    next = addToThread(next, 'me', coach.reply)
    onChange({ ...next, status: coach.status })
    setCoach(null)
    setReply('')
    toast('Save ho gaya ✅')
  }

  return (
    <div className="kh-coach">
      <b>💬 Client ne reply kiya?</b>
      <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Unka reply yahan paste karo" aria-label="Client ka reply" />
      <button className="kh-btn small" disabled={busy || !reply.trim()} onClick={ask}>{busy ? '🤖 Soch raha hai…' : '🤖 Jawab likho'}</button>
      {error && <p className="kh-error">⚠️ {error}</p>}
      {coach && (
        <>
          <p className="kh-next">👉 {coach.next_step}</p>
          <textarea rows={5} value={coach.reply} onChange={(e) => setCoach({ ...coach, reply: e.target.value })} aria-label="Mera jawab" />
          <div className="kh-actions">
            <button className="kh-btn small" onClick={() => copyText(coach.reply, toast)}>📋 Copy</button>
            <button className="kh-btn ghost small" onClick={sent}>✅ Bhej diya ({STATUSES[coach.status].label})</button>
          </div>
        </>
      )}
    </div>
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
        <h2>Roz ka kaam (30 minute)</h2>
        <ol className="kh-daily">{DAILY_STEPS.map((t) => <li key={t}>{t}</li>)}</ol>
      </section>

      <section className="kh-card">
        <h2>4 rules (account safe rahega)</h2>
        <ul className="kh-daily">{RULES.map((t) => <li key={t}>{t}</li>)}</ul>
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
