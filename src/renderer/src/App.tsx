import { HashRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { FloatingFlashcardButton } from './components/FloatingFlashcardButton'
import { Dashboard } from './pages/Dashboard'
import { Listening } from './pages/practice/Listening'
import { Reading } from './pages/practice/Reading'
import { Writing } from './pages/practice/Writing'
import { ExamSimulator } from './pages/ExamSimulator'
import { Analytics } from './pages/Analytics'
import { Library } from './pages/Library'
import { Flashcard } from './pages/Flashcard'

export default function App() {
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
        <FloatingFlashcardButton />
      </div>
    </HashRouter>
  )
}
