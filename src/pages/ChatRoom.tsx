import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchProfileNames } from '../lib/coach'
import {
  fetchConversation,
  fetchMemberIds,
  fetchMessages,
  markConversationRead,
  sendMessage,
  type Conversation,
  type Message,
} from '../lib/chat'

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })
}

export default function ChatRoom() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [conv, setConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    try {
      setMessages(await fetchMessages(id))
      markConversationRead(id)
    } catch (e) {
      console.error(e)
    }
  }, [id])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [c, ids] = await Promise.all([fetchConversation(id), fetchMemberIds(id)])
        if (!alive) return
        setConv(c)
        setNames(await fetchProfileNames(ids))
        await loadMessages()
      } catch (e) {
        console.error(e)
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    // Poll for new messages while the room is open.
    const t = window.setInterval(loadMessages, 4000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [id, loadMessages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !user || busy) return
    const body = text.trim()
    setText('')
    setBusy(true)
    try {
      await sendMessage(id, user.id, body)
      await loadMessages()
    } catch (err) {
      console.error(err)
      setText(body)
    } finally {
      setBusy(false)
    }
  }

  const otherName = () => {
    const other = Object.keys(names).find((uid) => uid !== user?.id)
    return other ? names[other] : 'Chat'
  }
  const heading = conv?.title || (conv?.kind === 'dm' ? otherName() : conv?.kind === 'herd' ? 'Herd chat' : 'Chat')

  return (
    <div className="chat-page">
      <div className="chat-head">
        <button className="link-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="chat-title">{heading}</div>
      </div>

      <div className="chat-scroll">
        {loaded && messages.length === 0 && (
          <div className="muted center" style={{ marginTop: 30, fontSize: 14 }}>No messages yet. Say hello 👋</div>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user?.id
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
              {!mine && <div className="msg-who">{names[m.user_id] ?? 'Member'}</div>}
              <div className="msg-bubble">{m.body}</div>
              <div className="msg-time">{timeLabel(m.created_at)}</div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={onSend}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          maxLength={1000}
        />
        <button className="btn btn-primary btn-sm" disabled={!text.trim() || busy} type="submit">
          Send
        </button>
      </form>
    </div>
  )
}
