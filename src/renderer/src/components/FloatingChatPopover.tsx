import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage, StoredChat, StoredChatMessage } from '../types'
import { ChatBubble } from './ChatBubble'

interface Props {
  onClose: () => void
}

export function FloatingChatPopover({ onClose }: Props) {
  const { t } = useTranslation()
  const [chats, setChats] = useState<StoredChat[]>([])
  const [activeChatId, setActiveChatId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { void loadChats() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function loadChats() {
    setChats(await window.api.getChats())
  }

  async function selectChat(id: number) {
    setActiveChatId(id)
    const stored: StoredChatMessage[] = await window.api.getChatMessages(id)
    setMessages(stored.map(m => ({ role: m.role, content: m.content })))
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function goBack() {
    setActiveChatId(null)
    setMessages([])
    setInput('')
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)

    let chatId = activeChatId
    if (chatId === null) {
      const name = text.length > 40 ? text.slice(0, 40) + '…' : text
      chatId = (await window.api.createChat(name)) as number
      setActiveChatId(chatId)
      await loadChats()
    }

    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    await window.api.appendChatMessage(chatId, 'user', text)

    try {
      const reply = await window.api.chatMessage(newMessages)
      const aiMsg: ChatMessage = { role: 'assistant', content: reply }
      setMessages([...newMessages, aiMsg])
      await window.api.appendChatMessage(chatId, 'assistant', reply)
      await loadChats()
    } catch {
      setMessages(newMessages)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const activeChat = chats.find(c => c.id === activeChatId)

  return (
    <div
      data-chat-popover
      className="flex flex-col bg-mantle border border-surface1 rounded-xl shadow-2xl w-80 h-[460px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface0 shrink-0">
        {activeChatId ? (
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm font-medium text-subtext0 hover:text-text transition-colors min-w-0"
          >
            <span className="shrink-0">←</span>
            <span className="truncate">{activeChat?.name ?? 'Chat'}</span>
          </button>
        ) : (
          <span className="text-sm font-semibold text-text">{t('floatingChat.title')}</span>
        )}
        <button onClick={onClose} className="text-subtext0 hover:text-text transition-colors text-base leading-none shrink-0 ml-2">✕</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {activeChatId ? (
          /* Messages */
          <div className="px-3 py-3 flex flex-col gap-3 min-h-full">
            {messages.length === 0 && !loading && (
              <p className="text-xs text-subtext0 text-center py-4">{t('floatingChat.startConversation')}</p>
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 bg-surface0 rounded-xl rounded-tl-sm">
                  <span className="flex gap-1 items-center">
                    <span className="w-1 h-1 bg-subtext0 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1 h-1 bg-subtext0 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1 h-1 bg-subtext0 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        ) : (
          /* Chat list */
          <>
            {chats.length === 0 ? (
              <p className="text-xs text-subtext0 text-center p-6">
                {t('floatingChat.placeholderNewChat')}
              </p>
            ) : (
              chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => void selectChat(chat.id)}
                  className="w-full text-left px-4 py-2.5 text-xs text-subtext0 hover:bg-surface0/60 hover:text-text transition-colors border-b border-surface0/40 last:border-0 truncate"
                >
                  💬 {chat.name}
                </button>
              ))
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-surface0 shrink-0 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
          }}
          placeholder={activeChatId ? t('floatingChat.placeholderActive') : t('floatingChat.placeholderNoChat')}
          rows={1}
          disabled={loading}
          autoFocus
          className="flex-1 bg-surface0 border border-surface1 rounded-lg px-3 py-1.5 text-xs text-text
            placeholder:text-subtext0 outline-none focus:border-mauve resize-none disabled:opacity-50
            min-h-[32px] max-h-20 overflow-y-auto"
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 80)}px`
          }}
        />
        <button
          onClick={() => void send()}
          disabled={!input.trim() || loading}
          className="px-3 py-1.5 bg-mauve text-base rounded-lg text-xs font-medium
            hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          ▶
        </button>
      </div>
    </div>
  )
}
