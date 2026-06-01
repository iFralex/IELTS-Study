import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChatBubble } from '../components/ChatBubble'
import type { ChatMessage, StoredChat, StoredChatMessage } from '../types'

const SUGGESTIONS = [
  'What is the difference between "affect" and "effect"?',
  'Come si usa il Present Perfect in inglese?',
  'Give me tips for IELTS Reading True/False/Not Given',
  'What are the most common IELTS Writing Task 2 essay types?',
  'Explain the difference between "despite" and "although"',
]

export function Chat() {
  const { t, i18n } = useTranslation()
  const [chats, setChats] = useState<StoredChat[]>([])
  const [activeChatId, setActiveChatId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingChatId, setEditingChatId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => { void loadChats() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { if (editingChatId !== null) editRef.current?.focus() }, [editingChatId])

  async function loadChats() {
    const list = await window.api.getChats()
    setChats(list)
  }

  async function selectChat(id: number) {
    setActiveChatId(id)
    setError(null)
    const stored: StoredChatMessage[] = await window.api.getChatMessages(id)
    setMessages(stored.map(m => ({ role: m.role, content: m.content })))
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function createChat() {
    const name = `Chat ${new Date().toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    const id = await window.api.createChat(name)
    await loadChats()
    await selectChat(id as number)
  }

  async function deleteChat(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    await window.api.deleteChat(id)
    if (activeChatId === id) {
      setActiveChatId(null)
      setMessages([])
    }
    await loadChats()
  }

  function startRename(chat: StoredChat, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingChatId(chat.id)
    setEditName(chat.name)
  }

  async function commitRename(id: number) {
    const name = editName.trim()
    if (name) await window.api.renameChat(id, name)
    setEditingChatId(null)
    await loadChats()
  }

  async function send(text = input.trim()) {
    if (!text || loading || activeChatId === null) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    await window.api.appendChatMessage(activeChatId, 'user', text)

    try {
      const reply = await window.api.chatMessage(newMessages)
      const aiMsg: ChatMessage = { role: 'assistant', content: reply }
      setMessages([...newMessages, aiMsg])
      await window.api.appendChatMessage(activeChatId, 'assistant', reply)
      await loadChats()
    } catch {
      setError(t('chat.aiError'))
      setMessages(newMessages)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  const activeChat = chats.find(c => c.id === activeChatId)

  return (
    <div className="h-full flex overflow-hidden">
      {/* Chat list sidebar */}
      <div className="w-56 shrink-0 bg-crust border-r border-surface0 flex flex-col h-full">
        <div className="px-3 py-3 border-b border-surface0">
          <button
            onClick={() => void createChat()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-mauve text-base rounded-lg text-sm font-medium hover:bg-mauve/90 transition-colors"
          >
            <span>+</span> {t('chat.newChat')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {chats.length === 0 && (
            <p className="text-xs text-subtext0 text-center px-4 py-6">{t('chat.noChats')}</p>
          )}
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => void selectChat(chat.id)}
              className={`group flex items-center gap-1 px-3 py-2 cursor-pointer transition-colors ${
                activeChatId === chat.id
                  ? 'bg-surface0 text-text border-l-2 border-mauve -ml-px'
                  : 'text-subtext0 hover:bg-surface0/50 hover:text-text'
              }`}
            >
              {editingChatId === chat.id ? (
                <input
                  ref={editRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void commitRename(chat.id)
                    if (e.key === 'Escape') setEditingChatId(null)
                    e.stopPropagation()
                  }}
                  onBlur={() => void commitRename(chat.id)}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-surface1 text-text text-xs rounded px-1.5 py-0.5 outline-none border border-mauve"
                />
              ) : (
                <span className="flex-1 min-w-0 text-xs truncate">{chat.name}</span>
              )}
              <div className="shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => startRename(chat, e)}
                  className="p-0.5 hover:text-mauve transition-colors text-xs"
                  title={t('chat.rename')}
                >✎</button>
                <button
                  onClick={e => void deleteChat(chat.id, e)}
                  className="p-0.5 hover:text-red transition-colors text-xs"
                  title={t('chat.delete')}
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <p className="text-subtext0 text-sm">{t('chat.selectChat')}</p>
            <button
              onClick={() => void createChat()}
              className="px-4 py-2 bg-mauve text-base rounded-lg text-sm font-medium hover:bg-mauve/90 transition-colors"
            >
              {t('chat.newChatBtn')}
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-surface0 shrink-0 flex items-center gap-2">
              <span className="text-sm font-semibold text-text truncate">{activeChat?.name}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && !loading && (
                <div className="max-w-4xl mx-auto">
                  <p className="text-sm text-subtext0 text-center mb-5">{t('chat.startConversation')}</p>
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

              <div className="max-w-4xl mx-auto flex flex-col gap-4">
                {messages.map((msg, i) => (
                  <ChatBubble key={i} role={msg.role} content={msg.content} showAvatar />
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

                {error && <p className="text-xs text-red text-center">{error}</p>}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-surface0 shrink-0">
              <div className="max-w-4xl mx-auto flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat.placeholder')}
                  rows={1}
                  disabled={loading}
                  className="flex-1 bg-surface0 border border-surface1 rounded-xl px-4 py-2.5 text-sm text-text
                    placeholder:text-subtext0 outline-none focus:border-mauve transition-colors resize-none
                    disabled:opacity-50 min-h-[42px] max-h-32 overflow-y-auto"
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
                  {t('chat.send')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
