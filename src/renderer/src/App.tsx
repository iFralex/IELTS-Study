import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Routes, Route } from 'react-router-dom'
import type { Language } from './i18n'
import { Sidebar } from './components/Sidebar'
import { FloatingFlashcardButton } from './components/FloatingFlashcardButton'
import { FloatingChatPopover } from './components/FloatingChatPopover'
import { AddCardModal } from './components/flashcard/AddCardModal'
import { Dashboard } from './pages/Dashboard'
import { Listening } from './pages/practice/Listening'
import { Reading } from './pages/practice/Reading'
import { Writing } from './pages/practice/Writing'
import { ExamSimulator } from './pages/ExamSimulator'
import { Analytics } from './pages/Analytics'
import { Flashcard } from './pages/Flashcard'
import { Chat } from './pages/Chat'
import { ReviewPage } from './pages/ReviewPage'

export default function App() {
  const { t, i18n } = useTranslation()
  const [flashModalOpen, setFlashModalOpen] = useState(false)

  useEffect(() => {
    window.api.getSetting('lang').then((lang: string | null) => {
      if (lang) i18n.changeLanguage(lang as Language)
    })
  }, [])
  const [chatPopoverOpen, setChatPopoverOpen] = useState(false)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('[data-selection-popover]')) return
      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ''
      if (text && text.split(/\s+/).length <= 4 && !text.includes('\n')) {
        const rect = sel!.getRangeAt(0).getBoundingClientRect()
        setPopoverPos({ x: rect.left + rect.width / 2, y: rect.top })
        setSelectedWord(text)
      } else {
        setPopoverPos(null)
        setSelectedWord(null)
      }
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-selection-popover]')) {
        setPopoverPos(null)
        setSelectedWord(null)
      }
      if (!target.closest('[data-chat-popover]')) {
        setChatPopoverOpen(false)
      }
    }
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [])

  function openModalFromSelection() {
    setFlashModalOpen(true)
    setPopoverPos(null)
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-base text-text overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/listening" element={<Listening />} />
            <Route path="/reading"   element={<Reading />} />
            <Route path="/writing"   element={<Writing />} />
            <Route path="/exam"      element={<ExamSimulator />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/flashcard" element={<Flashcard />} />
            <Route path="/chat"      element={<Chat />} />
            <Route path="/review/:sessionId" element={<ReviewPage />} />
          </Routes>
        </main>

        {/* Selection popover */}
        {popoverPos && selectedWord !== null && !flashModalOpen && (
          <div
            data-selection-popover
            style={{
              position: 'fixed',
              left: popoverPos.x,
              top: Math.max(8, popoverPos.y - 44),
              transform: 'translateX(-50%)',
            }}
            className="z-40 bg-mantle border border-surface1 rounded-lg px-2 py-1.5 shadow-xl flex items-center gap-2"
          >
            <input
              data-selection-popover
              value={selectedWord}
              onChange={e => setSelectedWord(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && selectedWord.trim()) openModalFromSelection()
                if (e.key === 'Escape') { setPopoverPos(null); setSelectedWord(null) }
              }}
              className="text-xs text-text bg-surface0 border border-surface1 rounded px-2 py-1 w-36 outline-none focus:border-mauve"
              autoFocus
            />
            <button
              onClick={() => {
                const u = new SpeechSynthesisUtterance(selectedWord.trim())
                u.lang = 'en-GB'
                speechSynthesis.cancel()
                speechSynthesis.speak(u)
              }}
              disabled={!selectedWord.trim()}
              title={t('selectionPopover.pronunciation')}
              className="text-subtext0 hover:text-text disabled:opacity-40 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            </button>
            <button
              onClick={openModalFromSelection}
              disabled={!selectedWord.trim()}
              className="text-xs text-mauve hover:text-mauve/80 font-semibold whitespace-nowrap disabled:opacity-40"
            >
              {t('selectionPopover.addFlashcard')}
            </button>
          </div>
        )}

        {/* Floating buttons — bottom center */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
          {chatPopoverOpen && (
            <div
              data-chat-popover
              className="absolute bottom-16 left-1/2 -translate-x-1/2"
            >
              <FloatingChatPopover onClose={() => setChatPopoverOpen(false)} />
            </div>
          )}
          <button
            data-chat-popover
            onClick={() => setChatPopoverOpen(o => !o)}
            className="w-12 h-12 rounded-full bg-surface1 text-text flex items-center justify-center text-xl shadow-lg hover:scale-110 hover:bg-surface2 transition-all"
            title="AI Tutor Chat"
          >
            💬
          </button>
          <FloatingFlashcardButton onClick={() => {
            setChatPopoverOpen(false)
            setPopoverPos({ x: window.innerWidth / 2, y: window.innerHeight - 80 })
            setSelectedWord('')
          }} />
        </div>
        {flashModalOpen && (
          <AddCardModal
            initialWord={selectedWord ?? undefined}
            onClose={() => { setFlashModalOpen(false); setSelectedWord(null) }}
          />
        )}
      </div>
    </HashRouter>
  )
}
