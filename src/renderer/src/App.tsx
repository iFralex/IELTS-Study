import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { FloatingFlashcardButton } from './components/FloatingFlashcardButton'
import { AddCardModal } from './components/flashcard/AddCardModal'
import { Dashboard } from './pages/Dashboard'
import { Listening } from './pages/practice/Listening'
import { Reading } from './pages/practice/Reading'
import { Writing } from './pages/practice/Writing'
import { ExamSimulator } from './pages/ExamSimulator'
import { Analytics } from './pages/Analytics'
import { Library } from './pages/Library'
import { Flashcard } from './pages/Flashcard'

export default function App() {
  const [flashModalOpen, setFlashModalOpen] = useState(false)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    function onMouseUp() {
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
            <Route path="/library"   element={<Library />} />
            <Route path="/flashcard" element={<Flashcard />} />
          </Routes>
        </main>

        {/* Selection popover */}
        {popoverPos && selectedWord && !flashModalOpen && (
          <div
            data-selection-popover
            style={{
              position: 'fixed',
              left: popoverPos.x,
              top: Math.max(8, popoverPos.y - 44),
              transform: 'translateX(-50%)',
            }}
            className="z-40 bg-mantle border border-surface1 rounded-lg px-3 py-1.5 shadow-xl flex items-center gap-2"
          >
            <span className="text-xs text-subtext0 max-w-[140px] truncate">{selectedWord}</span>
            <button
              onClick={openModalFromSelection}
              className="text-xs text-mauve hover:text-mauve/80 font-semibold whitespace-nowrap"
            >
              + Flashcard
            </button>
          </div>
        )}

        <FloatingFlashcardButton onClick={() => { setSelectedWord(null); setFlashModalOpen(true) }} />
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
