import { useState, useRef, useEffect } from 'react'
import { askEzra, wakeBackend } from '../lib/api'
import { ensureProtocol } from '../lib/utils'
import s from '../styles/Directory.module.css'

const CHIPS = ['Service times', 'How do I give?', 'Join a MAP group']
const HELLO = { text: "Hi, I'm Ezra 👋 Ask me about CCI Ajah: links, service times or giving." }

const Angel = () => (
  <span className={s.angel}><i className={s.wingL} /><i className={s.wingR} /><i className={s.angelBody} /></span>
)

// Ezra: the mascot in the corner and the chat window it opens
export default function Ezra() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([HELLO])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(null)
  const end = useRef()

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy, open])

  async function send(question) {
    question = question.trim()
    if (!question || busy) return
    setText('')
    setMsgs(m => [...m, { me: true, text: question }])
    setBusy(true)
    try {
      const r = await askEzra(question)
      setMsgs(m => [...m, { text: r.answer, links: r.links }])
    } catch {
      setMsgs(m => [...m, { text: "I couldn't reach the info desk just now. Please try again in a minute." }])
    }
    setBusy(false)
  }

  function copy(url) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (!open) {
    return (
      // the free backend sleeps when idle, so wake it as the chat opens
      <button className={s.ezra} aria-label="Chat with Ezra" onClick={() => { setOpen(true); wakeBackend() }}>
        <Angel />
      </button>
    )
  }

  return (
    <div className={s.chat} role="dialog" aria-label="Chat with Ezra">
      <div className={s.chatHead}>
        <span className={s.avatar}><Angel /></span>
        <div><b>Ezra</b><small>CCI Ajah helper</small></div>
        <button className={s.close} aria-label="Close chat" onClick={() => setOpen(false)}>✕</button>
      </div>
      <div className={s.chatBody} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`${s.msg} ${m.me ? s.msgMe : ''}`}>
            {m.text}
            {m.links?.map(l => {
              const url = ensureProtocol(l.url)
              return (
                <div key={l.id} className={s.linkCard}>
                  <b>{l.name}</b>
                  <div>
                    <a className={`${s.btn} ${s.btnMain}`} href={url} target="_blank" rel="noopener noreferrer">Open</a>
                    <button className={s.btn} onClick={() => copy(url)}>{copied === url ? '✓ Copied' : 'Copy link'}</button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {busy && <div className={s.msg}>Ezra is thinking…</div>}
        <span ref={end} />
      </div>
      <div className={s.chips}>
        {CHIPS.map(c => <button key={c} onClick={() => send(c)}>{c}</button>)}
      </div>
      <form className={s.chatForm} onSubmit={e => { e.preventDefault(); send(text) }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ask Ezra anything…"
          aria-label="Your question"
          maxLength={500}
        />
        <button type="submit" aria-label="Send" disabled={busy || !text.trim()}>➤</button>
      </form>
      <p className={s.chatNote}>Ezra can get things wrong. For urgent help, ask the info desk.</p>
    </div>
  )
}
