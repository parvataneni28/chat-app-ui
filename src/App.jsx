import React, { useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const WS_BASE = (import.meta.env.VITE_WS_BASE || 'ws://localhost:8000').replace(/^http/, 'ws')

export default function App() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [room, setRoom] = useState('global')
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const wsRef = useRef(null)
  const authed = !!token

  useEffect(() => {
    if (!authed) return
    fetchMessages(room)
  }, [authed, room])

  useEffect(() => {
    if (!authed) return

    const connect = () => {
      const wsUrl = `${WS_BASE}/ws?token=${encodeURIComponent(token)}&room=${encodeURIComponent(room)}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data?.type === 'message' && data?.room === room) {
            setMessages((prev) => [...prev, {
              id: data.id ?? `tmp-${Date.now()}`,
              content: data.content,
              room: data.room,
              created_at: data.created_at ?? new Date().toISOString(),
              user_id: data.user ?? 'anon',
            }])
          }
        } catch {}
      }
      ws.onclose = () => setTimeout(() => authed && connect(), 1000)
      ws.onerror = () => ws.close()
    }

    connect()
    return () => wsRef.current?.close()
  }, [authed, token, room])

  async function fetchMessages(rm = room) {
    try {
      const res = await fetch(`${API_BASE}/messages?room=${encodeURIComponent(rm)}&limit=50`)
      if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`)
      const data = await res.json()
      setMessages(data)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      if (!res.ok) throw new Error(await res.text())
      await handleLogin(e, true)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e, silent=false) {
    e.preventDefault()
    setLoading(true); if (!silent) setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || `Login failed: ${res.status}`)
      localStorage.setItem('token', data.access_token)
      setToken(data.access_token)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!content.trim()) return
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content, room })
      })
      if (!res.ok) throw new Error(`Send failed: ${res.status}`)
      const msg = await res.json()
      setMessages((prev) => [...prev, msg])
      setContent('')
    } catch (err) {
      setError(String(err))
    }
  }

  function logout() {
    localStorage.removeItem('token')
    setToken('')
    setMessages([])
  }

  return (
    <div className="container">
      <div className="toolbar">
        <h1>FastAPI ⚡ React Chat</h1>
        {authed && (
          <div className="row">
            <input className="input room-input" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="room" />
            <button className="btn" onClick={logout}>Logout</button>
          </div>
        )}
      </div>

      {!authed ? (
        <div className="row" style={{alignItems:'stretch'}}>
          <div className="card" style={{flex:1, padding:16}}>
            <h3>Login</h3>
            <form onSubmit={(e)=>handleLogin(e)} className="row" style={{flexDirection:'column'}}>
              <input className="input" placeholder="username" value={username} onChange={(e)=>setUsername(e.target.value)} autoComplete="username" />
              <input className="input" type="password" placeholder="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" />
              <button className="btn primary" disabled={loading}>{loading ? '…' : 'Login'}</button>
            </form>
          </div>
          <div className="card" style={{flex:1, padding:16}}>
            <h3>Register</h3>
            <form onSubmit={handleRegister} className="row" style={{flexDirection:'column'}}>
              <input className="input" placeholder="username" value={username} onChange={(e)=>setUsername(e.target.value)} />
              <input className="input" placeholder="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
              <input className="input" type="password" placeholder="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
              <button className="btn success" disabled={loading}>{loading ? '…' : 'Create account'}</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="messages" id="messages">
            {messages.length === 0 && <p className="meta">No messages yet. Say hi 👋</p>}
            {messages.map((m) => (
              <div key={m.id} className="message" style={{marginBottom:8}}>
                <div className="meta">
                  <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                  <span style={{marginLeft:8}} className="badge">{m.room}</span>
                </div>
                <div>{m.content}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSend} className="row" style={{padding:12, borderTop:'1px solid var(--border)'}}>
            <input className="input" placeholder={`Message #${room}`} value={content} onChange={(e)=>setContent(e.target.value)} />
            <button className="btn primary">Send</button>
          </form>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <footer>
        API: <code>{API_BASE}</code> · WS: <code>{WS_BASE}</code>
      </footer>
    </div>
  )
}
