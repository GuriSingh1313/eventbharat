// ============================================
// EventBharat - Full Demo App
// React + localStorage (No backend!)
// ============================================

import { useState, useEffect, useRef } from 'react'
import './App.css'

// 10 Indian Events seed data
const EVENTS = [
  { id:'e1', title:'Sunburn Festival 2025', city:'Goa', category:'Music', date:'Dec 28, 2025', time:'6:00 PM', venue:'Vagator Beach, Goa', emoji:'🎵', about:'Asia\'s biggest electronic music festival! 3 days of world-class DJs.', tickets:[{type:'General',price:1299},{type:'VIP',price:3499}] },
  { id:'e2', title:'Zakir Khan Live', city:'Delhi', category:'Comedy', date:'Nov 15, 2025', time:'7:30 PM', venue:'Siri Fort Auditorium', emoji:'😂', about:'India\'s favourite "Sakht Launda" with a brand new comedy set.', tickets:[{type:'Standard',price:799},{type:'Premium',price:1499}] },
  { id:'e3', title:'Startup India Summit', city:'Bangalore', category:'Tech', date:'Oct 20, 2025', time:'9:00 AM', venue:'NIMHANS Centre', emoji:'💻', about:'India\'s largest startup conference. 200+ speakers, 5000+ attendees.', tickets:[{type:'Free Entry',price:0},{type:'Workshop',price:999}] },
  { id:'e4', title:'IPL Watch Party', city:'Mumbai', category:'Sports', date:'Apr 10, 2026', time:'7:00 PM', venue:'NESCO, Goregaon', emoji:'⚽', about:'Watch IPL on a 40-foot LED screen! Open bar, food stalls, DJ.', tickets:[{type:'Entry',price:499},{type:'Premium',price:1999}] },
  { id:'e5', title:'Street Food Festival', city:'Jaipur', category:'Food', date:'Jan 18, 2026', time:'11:00 AM', venue:'Jawahar Kala Kendra', emoji:'🍕', about:'70+ food stalls, live cooking, regional cuisines. Entry FREE!', tickets:[{type:'Free Entry',price:0}] },
  { id:'e6', title:'EDM Night Out', city:'Chandigarh', category:'Music', date:'Nov 30, 2025', time:'9:00 PM', venue:'Elante Club', emoji:'🎧', about:'Epic EDM night with top Punjabi DJs. Laser shows, pyrotechnics.', tickets:[{type:'Stag',price:999},{type:'Couple',price:1499}] },
  { id:'e7', title:'Stand-up Open Mic', city:'Hyderabad', category:'Comedy', date:'Oct 25, 2025', time:'8:00 PM', venue:'The Irish House', emoji:'🎤', about:'15 comedians compete for the Golden Mic award.', tickets:[{type:'Entry',price:299}] },
  { id:'e8', title:'Yoga & Wellness Retreat', city:'Rishikesh', category:'Wellness', date:'Feb 14, 2026', time:'6:00 AM', venue:'Parmarth Niketan', emoji:'🧘', about:'3-day wellness retreat on Ganga. Yoga, meditation, Ayurvedic meals.', tickets:[{type:'Day Pass',price:599},{type:'Full Retreat',price:2499}] },
  { id:'e9', title:'Indie Band Night', city:'Pune', category:'Music', date:'Dec 6, 2025', time:'7:00 PM', venue:'Hard Rock Cafe', emoji:'🎸', about:'6 indie bands, 4 hours of original music.', tickets:[{type:'Entry',price:399}] },
  { id:'e10', title:'Gaming Tournament', city:'Noida', category:'Gaming', date:'Nov 22, 2025', time:'10:00 AM', venue:'DLF Mall', emoji:'🎮', about:'BGMI, Valorant, FIFA tournaments. ₹2 Lakh prize pool.', tickets:[{type:'Player',price:0},{type:'Spectator',price:199}] }
]

// Demo accounts
const DEMO_USERS = [
  { email:'user@demo.com', password:'demo123', name:'Demo User' },
  { email:'org@demo.com', password:'org123', name:'Event Organizer' }
]

const CATEGORIES = ['All','Music','Comedy','Tech','Sports','Food','Gaming','Wellness']

// MAIN APP
function App() {
  const [screen, setScreen] = useState('home')
  const [user, setUser] = useState(null)
  const [currentEvent, setCurrentEvent] = useState(null)
  const [toast, setToast] = useState({ show:false, msg:'', type:'success' })
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')

  // Page load par user load kar
  useEffect(() => {
    const saved = localStorage.getItem('eb_user')
    if(saved) setUser(JSON.parse(saved))
    // Browser notification permission
    if('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const showToast = (msg, type='success') => {
    setToast({ show:true, msg, type })
    setTimeout(() => setToast({ show:false, msg:'', type }), 3000)
  }

  const sendNotification = (title, body) => {
    if('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('eb_user')
    showToast('Logged out!')
    setScreen('home')
  }

  // Filter events
  const filteredEvents = EVENTS.filter(e => {
    const matchCat = cat === 'All' || e.category === cat
    const q = search.toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.city.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <div className="app">
      {toast.show && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
{/* Top navigation - laptop pe Home/Tickets/Profile */}
      <div className="top-nav">
        <div className="top-nav-brand" onClick={() => setScreen('home')}>
          Event<span>Bharat</span>
        </div>
        <div className="top-nav-links">
          <button 
            className={`top-nav-btn ${screen==='home'?'active':''}`}
            onClick={() => setScreen('home')}>
            🏠 Home
          </button>
          <button 
            className={`top-nav-btn ${screen==='tickets'?'active':''}`}
            onClick={() => {
              if(!user) { setScreen('login'); showToast('Please login first','error'); return }
              setScreen('tickets')
            }}>
            🎟️ Tickets
          </button>
          <button 
            className={`top-nav-btn ${screen==='profile'?'active':''}`}
            onClick={() => setScreen('profile')}>
            👤 Profile
          </button>
        </div>
      </div>
      {screen === 'home' && <HomeScreen 
        events={filteredEvents} 
        search={search} setSearch={setSearch}
        cat={cat} setCat={setCat}
        onOpenEvent={(e) => { setCurrentEvent(e); setScreen('detail') }}
      />}

      {screen === 'detail' && <DetailScreen 
        event={currentEvent} 
        onBack={() => setScreen('home')}
        onBook={() => {
          if(!user) { setScreen('login'); showToast('Please login first','error'); return }
          setScreen('booking')
        }}
      />}

      {screen === 'booking' && <BookingScreen 
        event={currentEvent} user={user}
        onBack={() => setScreen('detail')}
        onConfirm={(booking) => {
          const all = JSON.parse(localStorage.getItem('eb_bookings') || '[]')
          all.push(booking)
          localStorage.setItem('eb_bookings', JSON.stringify(all))
          sendNotification('🎉 Booking Confirmed!', `Your ticket for ${booking.eventTitle} is ready`)
          showToast('Booking confirmed! 🎉')
          setCurrentEvent({ ...currentEvent, lastBooking: booking })
          setScreen('confirm')
        }}
      />}

      {screen === 'confirm' && <ConfirmScreen 
        booking={currentEvent?.lastBooking}
        onHome={() => setScreen('home')}
        onTickets={() => setScreen('tickets')}
      />}

      {screen === 'tickets' && <TicketsScreen user={user} />}

      {screen === 'login' && <LoginScreen 
        onLogin={(u) => { setUser(u); localStorage.setItem('eb_user', JSON.stringify(u)); showToast(`Welcome ${u.name}!`); setScreen('home') }}
        onShowRegister={() => setScreen('register')}
        showToast={showToast}
      />}

      {screen === 'register' && <RegisterScreen 
        onRegister={(u) => { setUser(u); localStorage.setItem('eb_user', JSON.stringify(u)); showToast(`Welcome ${u.name}!`); setScreen('home') }}
        onBack={() => setScreen('login')}
        showToast={showToast}
      />}

      {screen === 'profile' && <ProfileScreen 
        user={user} 
        onLogout={logout}
        onLogin={() => setScreen('login')}
      />}

      <nav className="bottom-nav">
        <button className={`nav-btn ${screen==='home'?'active':''}`} onClick={() => setScreen('home')}>
          🏠<span>Home</span>
        </button>
        <button className={`nav-btn ${screen==='tickets'?'active':''}`} onClick={() => {
          if(!user) { setScreen('login'); showToast('Please login first','error'); return }
          setScreen('tickets')
        }}>
          🎟️<span>Tickets</span>
        </button>
        <button className={`nav-btn ${screen==='profile'?'active':''}`} onClick={() => setScreen('profile')}>
          👤<span>Profile</span>
        </button>
      </nav>
    </div>
  )
}

// HOME SCREEN
function HomeScreen({ events, search, setSearch, cat, setCat, onOpenEvent }) {
  return (
    <div className="screen">
      <div className="topbar">
        <div className="brand">Event<span>Bharat</span></div>
      </div>
      <div className="hero">
        <h1>Discover <span className="grad">Events</span><br/>Near You 🔥</h1>
        <p>Concerts • Comedy • Tech • Sports • Food</p>
        <div className="search-bar">
          <input type="text" placeholder="🔍 Search events, cities..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="cats">
        {CATEGORIES.map(c => (
          <div key={c} className={`cat-pill ${cat===c?'active':''}`}
            onClick={() => setCat(c)}>{c}</div>
        ))}
      </div>
      <div className="section-title">🎉 {events.length} Events</div>
      <div className="events-grid">
        {events.map(e => {
          const minPrice = Math.min(...e.tickets.map(t => t.price))
          return (
            <div key={e.id} className="event-card" onClick={() => onOpenEvent(e)}>
              <div className="event-img">{e.emoji}</div>
              <div className="event-info">
                <div className="event-title">{e.title}</div>
                <div className="event-meta">📅 {e.date}</div>
                <div className="event-meta">📍 {e.city}</div>
                <div className="event-bottom">
                  <span className={minPrice===0?'badge badge-free':'badge badge-paid'}>
                    {minPrice===0?'FREE':'₹'+minPrice}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// DETAIL SCREEN
function DetailScreen({ event, onBack, onBook }) {
  if(!event) return null
  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>
      <div className="detail-banner">{event.emoji}</div>
      <div className="detail-content">
        <span className="badge badge-paid">{event.category}</span>
        <h2 className="detail-title">{event.title}</h2>
        <div className="meta-row">📅 {event.date} • {event.time}</div>
        <div className="meta-row">📍 {event.venue}</div>
        <p className="about-text">{event.about}</p>
        <h3 className="section-h3">🎟️ Available Tickets</h3>
        {event.tickets.map((t,i) => (
          <div key={i} className="ticket-option">
            <div className="ticket-name">{t.type}</div>
            <div className="ticket-price">{t.price===0?'FREE':'₹'+t.price}</div>
          </div>
        ))}
        <button className="btn btn-primary btn-full" onClick={onBook}>Book Now →</button>
      </div>
    </div>
  )
}

// BOOKING SCREEN
function BookingScreen({ event, user, onBack, onConfirm }) {
  const [step, setStep] = useState(1)
  const [ticketIdx, setTicketIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')

  const ticket = event.tickets[ticketIdx]
  const total = ticket.price * qty

  const handleNext = () => {
    if(step === 2 && (!name || !email)) { alert('Please fill all fields!'); return }
    setStep(step + 1)
  }

  const handleConfirm = () => {
    onConfirm({
      id: 'BK' + Date.now(),
      eventId: event.id, eventTitle: event.title,
      eventDate: event.date, eventCity: event.city,
      eventEmoji: event.emoji, ticketType: ticket.type,
      quantity: qty, totalPrice: total,
      userEmail: user.email,
      bookedAt: new Date().toLocaleDateString()
    })
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div>Step {step} of 3</div>
      </div>
      <div className="booking-wrap">
        <div className="step-indicator">
          <div className={`step ${step>=1?'active':''}`}>1</div>
          <div className="step-line"></div>
          <div className={`step ${step>=2?'active':''}`}>2</div>
          <div className="step-line"></div>
          <div className={`step ${step>=3?'active':''}`}>3</div>
        </div>

        {step === 1 && (
          <div>
            <h3>Select Ticket Type</h3>
            {event.tickets.map((t,i) => (
              <div key={i} className={`ticket-option ${ticketIdx===i?'selected':''}`}
                onClick={() => setTicketIdx(i)}>
                <div className="ticket-name">{t.type}</div>
                <div className="ticket-price">{t.price===0?'FREE':'₹'+t.price}</div>
              </div>
            ))}
            <div className="qty-row">
              <span>Quantity:</span>
              <button onClick={() => setQty(Math.max(1, qty-1))}>-</button>
              <span className="qty-val">{qty}</span>
              <button onClick={() => setQty(Math.min(5, qty+1))}>+</button>
            </div>
            <div className="summary-card">
              <div className="summary-row"><span>Total</span><b>{total===0?'FREE':'₹'+total}</b></div>
            </div>
            <button className="btn btn-primary btn-full" onClick={handleNext}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>Your Details</h3>
            <input type="text" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} className="input"/>
            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="input"/>
            <input type="tel" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} className="input"/>
            <button className="btn btn-primary btn-full" onClick={handleNext}>Continue to Pay →</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3>Payment Summary</h3>
            <div className="summary-card">
              <div className="summary-row"><span>Event:</span><span>{event.title}</span></div>
              <div className="summary-row"><span>Ticket:</span><span>{ticket.type} × {qty}</span></div>
              <div className="summary-row"><b>Total:</b><b>{total===0?'FREE':'₹'+total}</b></div>
            </div>
            <p className="info-box">✅ This is a demo - no real payment</p>
            <button className="btn btn-primary btn-full" onClick={handleConfirm}>
              {total===0?'Confirm Free Booking':`Pay ₹${total} & Book`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// CONFIRM SCREEN with QR
function ConfirmScreen({ booking, onHome, onTickets }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if(!canvasRef.current || !booking) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0,0,140,140)
    ctx.fillStyle = '#111'
    let seed = booking.id.split('').reduce((a,c) => a+c.charCodeAt(0), 0)
    const rand = () => { seed = (seed*9301+49297)%233280; return seed/233280 }
    const size = 7
    ;[[0,0],[91,0],[0,91]].forEach(([x,y]) => {
      ctx.fillRect(x,y,49,49)
      ctx.fillStyle='#fff'; ctx.fillRect(x+7,y+7,35,35)
      ctx.fillStyle='#111'; ctx.fillRect(x+14,y+14,21,21)
    })
    for(let r=0;r<20;r++) for(let c=0;c<20;c++) {
      if((c<8&&r<8)||(c<8&&r>12)||(c>12&&r<8)) continue
      if(rand()>0.5) ctx.fillRect(c*size,r*size,size,size)
    }
  }, [booking])

  if(!booking) return null

  return (
    <div className="screen">
      <div style={{padding:'30px 16px',textAlign:'center'}}>
        <div style={{fontSize:32,marginBottom:8}}>🎉 🎟️ 🎉</div>
        <h2>Booking Confirmed!</h2>
        <p style={{color:'#888',fontSize:14}}>Your ticket is ready</p>
      </div>
      <div className="ticket-card">
        <div style={{fontSize:32,marginBottom:8}}>{booking.eventEmoji}</div>
        <h3>{booking.eventTitle}</h3>
        <div style={{color:'#888',fontSize:13,marginTop:4}}>{booking.eventDate} • {booking.eventCity}</div>
        <div className="qr-box">
          <canvas ref={canvasRef} width="140" height="140"></canvas>
        </div>
        <div style={{fontSize:12,color:'#888'}}>Booking ID: {booking.id}</div>
        <div style={{marginTop:8,fontSize:13}}>{booking.ticketType} × {booking.quantity}</div>
      </div>
      <div style={{padding:'0 16px',display:'flex',gap:10}}>
        <button className="btn btn-outline btn-full" onClick={onTickets}>My Tickets</button>
        <button className="btn btn-primary btn-full" onClick={onHome}>Home</button>
      </div>
    </div>
  )
}

// MY TICKETS
function TicketsScreen({ user }) {
  const all = JSON.parse(localStorage.getItem('eb_bookings') || '[]')
  const mine = all.filter(b => b.userEmail === user?.email).reverse()

  return (
    <div className="screen">
      <div className="topbar"><div className="brand">My <span>Tickets</span></div></div>
      {mine.length === 0 ? (
        <div className="empty-state">
          <div style={{fontSize:48}}>🎟️</div>
          <div>No tickets yet!</div>
          <div style={{color:'#888',fontSize:13,marginTop:8}}>Book your first event</div>
        </div>
      ) : (
        <div style={{padding:16}}>
          {mine.map(b => (
            <div key={b.id} className="ticket-list-item">
              <div className="tli-event">{b.eventEmoji} {b.eventTitle}</div>
              <div className="tli-meta">{b.eventDate} • {b.eventCity}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
                <span>{b.ticketType} × {b.quantity}</span>
                <b style={{color:'#c084fc'}}>{b.totalPrice===0?'FREE':'₹'+b.totalPrice}</b>
              </div>
              <div style={{fontSize:11,color:'#666',marginTop:4}}>ID: {b.id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// LOGIN
function LoginScreen({ onLogin, onShowRegister, showToast }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')

  const handleLogin = () => {
    let user = DEMO_USERS.find(u => u.email === email && u.password === pass)
    if(!user) {
      const registered = JSON.parse(localStorage.getItem('eb_users') || '[]')
      user = registered.find(u => u.email === email && u.password === pass)
    }
    if(!user) { showToast('Wrong email or password!','error'); return }
    onLogin(user)
  }

  return (
    <div className="screen">
      <div className="topbar"><div className="brand">Event<span>Bharat</span></div></div>
      <div className="auth-wrap">
        <h2>Welcome Back 👋</h2>
        <p>Login to book events</p>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="input"/>
        <input type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} className="input"/>
        <button className="btn btn-primary btn-full" onClick={handleLogin}>Login</button>
        <div style={{textAlign:'center',marginTop:14,fontSize:13}}>
          Don't have account? <span style={{color:'#c084fc',cursor:'pointer'}} onClick={onShowRegister}>Register</span>
        </div>
        <div className="demo-box">
          <b>Demo Accounts 🔑</b>
          <div>user@demo.com / demo123</div>
          <div>org@demo.com / org123</div>
        </div>
      </div>
    </div>
  )
}

// REGISTER
function RegisterScreen({ onRegister, onBack, showToast }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')

  const handleRegister = () => {
    if(!name || !email || !pass) { showToast('Fill all fields!','error'); return }
    if(pass.length < 6) { showToast('Password 6+ chars!','error'); return }
    const users = JSON.parse(localStorage.getItem('eb_users') || '[]')
    if(users.find(u => u.email === email) || DEMO_USERS.find(u => u.email === email)) {
      showToast('Email already registered!','error'); return
    }
    const newUser = { name, email, password: pass }
    users.push(newUser)
    localStorage.setItem('eb_users', JSON.stringify(users))
    onRegister(newUser)
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>
      <div className="auth-wrap">
        <h2>Create Account ✨</h2>
        <p>Join EventBharat - it's free!</p>
        <input type="text" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} className="input"/>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="input"/>
        <input type="password" placeholder="Password (6+ chars)" value={pass} onChange={e=>setPass(e.target.value)} className="input"/>
        <button className="btn btn-primary btn-full" onClick={handleRegister}>Create Account</button>
      </div>
    </div>
  )
}

// PROFILE
function ProfileScreen({ user, onLogout, onLogin }) {
  if(!user) {
    return (
      <div className="screen">
        <div className="topbar"><div className="brand">Profile</div></div>
        <div className="empty-state">
          <div style={{fontSize:48}}>👋</div>
          <div>Not logged in</div>
          <button className="btn btn-primary" style={{marginTop:16}} onClick={onLogin}>Login Now</button>
        </div>
      </div>
    )
  }

  const all = JSON.parse(localStorage.getItem('eb_bookings') || '[]')
  const mine = all.filter(b => b.userEmail === user.email)
  const totalSpent = mine.reduce((s,b) => s+b.totalPrice, 0)

  return (
    <div className="screen">
      <div className="topbar"><div className="brand">Profile</div></div>
      <div className="profile-wrap">
        <div className="avatar">{user.name[0].toUpperCase()}</div>
        <h2 style={{textAlign:'center'}}>{user.name}</h2>
        <p style={{textAlign:'center',color:'#888',fontSize:13}}>{user.email}</p>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-val">{mine.length}</div>
            <div className="stat-label">Bookings</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">{totalSpent===0?'FREE':'₹'+totalSpent}</div>
            <div className="stat-label">Total Spent</div>
          </div>
        </div>
        <button className="btn btn-danger btn-full" onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}

export default App