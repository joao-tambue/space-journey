import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, RotateCcw, Send, Sparkles, Square, X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { SUGGESTIONS, systemPrompt } from '../data/assistant'
import { useMission } from '../store/missionStore'

const HISTORY_LIMIT = 16

// Markdown mínimo (negrito, itálico, código, listas, títulos, blocos ```) renderizado como nós React, sem HTML cru.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    return <Fragment key={i}>{part}</Fragment>
  })
}

function Markdown({ text }) {
  const blocks = []
  let fence = null
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (line.trimStart().startsWith('```')) {
      if (fence) {
        fence = null
      } else {
        fence = { kind: 'pre', items: [] }
        blocks.push(fence)
      }
      continue
    }
    if (fence) {
      fence.items.push(raw)
      continue
    }
    const heading = line.match(/^\s*#{1,6}\s+(.*)/)
    if (heading) {
      blocks.push({ kind: 'h', items: [heading[1]] })
      continue
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)/)
    const kind = bullet ? 'ul' : numbered ? 'ol' : 'p'
    const content = bullet?.[1] ?? numbered?.[1] ?? line
    const last = blocks.at(-1)
    if (!content.trim()) {
      blocks.push({ kind: 'gap' })
    } else if (kind !== 'p' && last?.kind === kind) {
      last.items.push(content)
    } else if (kind === 'p' && last?.kind === 'p') {
      last.items.push(content)
    } else {
      blocks.push({ kind, items: [content] })
    }
  }
  return blocks.map((b, i) => {
    if (b.kind === 'gap') return null
    if (b.kind === 'pre') {
      return (
        <pre key={i}>
          <code>{b.items.join('\n')}</code>
        </pre>
      )
    }
    if (b.kind === 'h') return <h4 key={i}>{inline(b.items[0])}</h4>
    if (b.kind === 'p') {
      return (
        <p key={i}>
          {b.items.map((l, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {inline(l)}
            </Fragment>
          ))}
        </p>
      )
    }
    const List = b.kind
    return (
      <List key={i}>
        {b.items.map((l, j) => (
          <li key={j}>{inline(l)}</li>
        ))}
      </List>
    )
  })
}

async function streamGemini(history, signal, onChunk) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(useMission.getState()) }] },
      contents: history.slice(-HISTORY_LIMIT).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      generationConfig: { temperature: 0.6 },
    }),
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      detail = (await res.json())?.error?.message ?? detail
    } catch {
      // resposta sem JSON
    }
    throw new Error(detail)
  }

  const handle = (evt) => {
    const data = evt
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .join('')
    if (!data) return
    const candidate = JSON.parse(data).candidates?.[0]
    const text = candidate?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('')
    if (text) onChunk(text)
    if (candidate?.finishReason === 'MAX_TOKENS') onChunk('\n\n*(resposta cortada por limite de tamanho)*')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop()
    events.forEach(handle)
  }
  handle(buffer + decoder.decode())
}

export default function ChatDock() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef(null)
  const scroller = useRef(null)
  const input = useRef(null)

  const pinned = useRef(true)

  // Segue o fim da conversa durante o streaming, a menos que o utilizador tenha subido para ler.
  useEffect(() => {
    const el = scroller.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [messages, busy, error])

  useEffect(() => {
    if (open) input.current?.focus()
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function send(text) {
    const question = text.trim()
    if (!question || busy) return
    setError('')
    setDraft('')
    pinned.current = true
    const history = [...messages, { id: crypto.randomUUID(), role: 'user', text: question }]
    const replyId = crypto.randomUUID()
    setMessages([...history, { id: replyId, role: 'model', text: '' }])
    setBusy(true)
    abort.current = new AbortController()
    try {
      await streamGemini(history, abort.current.signal, (chunk) =>
        setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, text: m.text + chunk } : m))),
      )
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(`Sem ligação ao Gemini: ${err.message}`)
      }
    } finally {
      // Remove a bolha vazia se a resposta falhou antes do primeiro fragmento.
      setMessages((list) => list.filter((m) => m.id !== replyId || m.text))
      setBusy(false)
      abort.current = null
    }
  }

  function reset() {
    abort.current?.abort()
    setMessages([])
    setError('')
  }

  const waiting = busy && !messages.at(-1)?.text

  return (
    <div className="chatdock">
      <AnimatePresence>
        {open && (
          <motion.section
            key="panel"
            className="chat"
            role="dialog"
            aria-label="Assistente Origem"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <header className="chat-head">
              <span className="chat-avatar" aria-hidden="true">
                <Sparkles size={16} />
              </span>
              <div>
                <strong>Origem</strong>
                <p>
                  <i className="chat-dot" /> assistente de bordo · Gemini
                </p>
              </div>
              <button type="button" className="chat-icon" onClick={reset} aria-label="Nova conversa" title="Nova conversa">
                <RotateCcw size={15} />
              </button>
              <button type="button" className="chat-icon" onClick={() => setOpen(false)} aria-label="Fechar chat">
                <X size={16} />
              </button>
            </header>

            <div
              className="chat-body"
              ref={scroller}
              aria-live="polite"
              onScroll={(e) => {
                const el = e.currentTarget
                pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
              }}
            >
              {messages.length === 0 && (
                <div className="chat-empty">
                  <p className="chat-hello">
                    Olá. Sou a <b>Origem</b>. Pergunta-me sobre a missão, a sonda, a energia, a cena 3D ou o
                    código do projecto. Vejo o estado da nave em tempo real.
                  </p>
                  <div className="chat-suggest">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.filter((m) => m.text).map((m) => (
                <motion.article
                  key={m.id}
                  className={`chat-msg chat-msg--${m.role}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {m.role === 'user' ? <p>{m.text}</p> : <Markdown text={m.text} />}
                </motion.article>
              ))}
              {waiting && (
                <div className="chat-typing" aria-label="A pensar">
                  <span />
                  <span />
                  <span />
                </div>
              )}
              {error && <p className="chat-error">{error}</p>}
            </div>

            <form
              className="chat-input"
              onSubmit={(e) => {
                e.preventDefault()
                send(draft)
              }}
            >
              <textarea
                ref={input}
                rows={1}
                value={draft}
                placeholder="Pergunta à Origem…"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(draft)
                  }
                }}
              />
              {busy ? (
                <button type="button" className="chat-send" onClick={() => abort.current?.abort()} aria-label="Parar resposta">
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button type="submit" className="chat-send" disabled={!draft.trim()} aria-label="Enviar">
                  <Send size={16} />
                </button>
              )}
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className={`chat-fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente Origem'}
        aria-expanded={open}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'x' : 'chat'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            {open ? <X size={22} /> : <MessageCircle size={22} />}
          </motion.span>
        </AnimatePresence>
        {!open && <span className="chat-fab-ring" aria-hidden="true" />}
      </motion.button>
    </div>
  )
}
