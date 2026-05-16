import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../types'

const SUGGESTIONS = [
  'What is the difference between "affect" and "effect"?',
  'Come si usa il Present Perfect in inglese?',
  'Give me tips for IELTS Reading True/False/Not Given',
  'What are the most common IELTS Writing Task 2 essay types?',
  'Explain the difference between "despite" and "although"',
]

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text = input.trim()) {
    if (!text || loading) return
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const reply = await window.api.chatMessage(newMessages)
      setMessages([...newMessages, { role: 'assistant', content: reply }])
    } catch {
      setError('Errore nella risposta AI. Riprova.')
      setMessages(newMessages)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface0 shrink-0">
        <h1 className="text-lg font-bold text-text">AI Tutor</h1>
        <p className="text-xs text-subtext0 mt-0.5">Chiedi qualsiasi cosa sulla lingua inglese o l'IELTS</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <div className="max-w-2xl mx-auto">
            <p className="text-sm text-subtext0 text-center mb-6">Inizia una conversazione o scegli un suggerimento</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => void send(s)}
                  className="text-left px-4 py-3 bg-surface0/40 hover:bg-surface0 border border-surface1 rounded-lg text-sm text-subtext0 hover:text-text transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                msg.role === 'user' ? 'bg-mauve/20 text-mauve' : 'bg-surface1 text-subtext0'
              }`}>
                {msg.role === 'user' ? 'T' : 'AI'}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-mauve/20 text-text rounded-tr-sm'
                  : 'bg-surface0 text-text rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full shrink-0 bg-surface1 flex items-center justify-center text-xs font-bold text-subtext0">AI</div>
              <div className="px-4 py-3 bg-surface0 rounded-2xl rounded-tl-sm">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-subtext0 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-subtext0 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-subtext0 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red text-center">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-surface0 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio… (Invio per inviare, Shift+Invio per andare a capo)"
            rows={1}
            disabled={loading}
            className="flex-1 bg-surface0 border border-surface1 rounded-xl px-4 py-2.5 text-sm text-text
              placeholder:text-subtext0 outline-none focus:border-mauve transition-colors resize-none
              disabled:opacity-50 min-h-[42px] max-h-32 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-mauve text-base rounded-xl text-sm font-medium
              hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Invia
          </button>
        </div>
      </div>
    </div>
  )
}
