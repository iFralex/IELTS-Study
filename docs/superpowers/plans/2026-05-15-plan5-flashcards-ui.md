# Flashcards UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `/flashcard` page with SM-2 review (text + audio modes), a card library with delete, and wire the floating 🃏 button to an AI-powered add-card modal.

**Architecture:** Six tasks in dependency order: utilities + tests → backend (types/DB/IPC/preload) → App wiring + AddCardModal → CardLibrary → ReviewSession → Flashcard page. All UI components are under `src/renderer/src/components/flashcard/`. The modal state lives in `App.tsx` so `FloatingFlashcardButton` (rendered outside any route) can trigger it from anywhere.

**Tech Stack:** React 18 + TypeScript, Tailwind v4 Catppuccin Mocha (`text-base` = color `#1e1e2e` NOT font-size), Web Speech API TTS, better-sqlite3, existing IPC + 2 new handlers, Claude Haiku, Vitest (node env).

---

### Task 1: flashcardUtils + tests

**Files:**
- Create: `src/renderer/src/components/flashcard/flashcardUtils.ts`
- Create: `src/tests/flashcardUtils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/flashcardUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pickMode, computeQualityFromDual } from '../renderer/src/components/flashcard/flashcardUtils'

describe('pickMode', () => {
  it('always returns a valid mode', () => {
    const valid = new Set(['text-en-it', 'text-it-en', 'audio'])
    for (let i = 0; i < 100; i++) expect(valid.has(pickMode())).toBe(true)
  })
  it('returns all three modes across many calls', () => {
    const seen = new Set(Array.from({ length: 300 }, () => pickMode()))
    expect(seen.size).toBe(3)
  })
})

describe('computeQualityFromDual', () => {
  it('both correct → 5', () => expect(computeQualityFromDual(true, true)).toBe(5))
  it('english only → 3', () => expect(computeQualityFromDual(true, false)).toBe(3))
  it('italian only → 3', () => expect(computeQualityFromDual(false, true)).toBe(3))
  it('both wrong → 1', () => expect(computeQualityFromDual(false, false)).toBe(1))
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm test 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module '../renderer/src/components/flashcard/flashcardUtils'"

- [ ] **Step 3: Create the flashcard directory and write the implementation**

First create the directory:
```bash
mkdir -p "/Users/alessioantonucci/Downloads/ielts liz/src/renderer/src/components/flashcard"
```

Create `src/renderer/src/components/flashcard/flashcardUtils.ts`:

```ts
export type ReviewMode = 'text-en-it' | 'text-it-en' | 'audio'

export function pickMode(): ReviewMode {
  const r = Math.random()
  if (r < 0.33) return 'text-en-it'
  if (r < 0.66) return 'text-it-en'
  return 'audio'
}

export function computeQualityFromDual(englishCorrect: boolean, italianCorrect: boolean): number {
  if (englishCorrect && italianCorrect) return 5
  if (englishCorrect || italianCorrect) return 3
  return 1
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm test 2>&1 | tail -20
```

Expected: all tests PASS (including existing tests from previous plans)

- [ ] **Step 5: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/components/flashcard/flashcardUtils.ts src/tests/flashcardUtils.test.ts && git commit -m "feat: add flashcardUtils — pickMode, computeQualityFromDual"
```

---

### Task 2: Backend layer — types, DB migration, IPC, preload

**Files:**
- Modify: `src/renderer/src/types/index.ts`
- Modify: `src/main/db.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/index.ts`

No unit tests for this task — IPC handlers are integration-level and require the running app.

- [ ] **Step 1: Update types**

In `src/renderer/src/types/index.ts`, make these changes:

**Replace the `Flashcard` interface (currently at line 94):**
```ts
export interface Flashcard {
  id: number
  english: string
  italian: string
  synonyms_en: string | null
  synonyms_it: string | null
  examples_en: string
  examples_it: string
  interval: number
  ease_factor: number
  repetitions: number
  next_review: number
  created_at: number
  source: string
}
```

**Replace the `FlashcardInput` interface (currently at line 108):**
```ts
export interface FlashcardInput {
  english: string
  italian: string
  synonyms_en?: string | null
  synonyms_it?: string | null
  examples_en: string
  examples_it: string
  source?: string
}
```

**Replace the `ReviewInput` interface (currently at line 116) — adds `'audio'` to direction:**
```ts
export interface ReviewInput {
  flashcard_id: number
  reviewed_at: number
  direction: 'en-it' | 'it-en' | 'audio'
  user_answer: string
  quality: number
  is_correct: boolean
}
```

**Replace the `AIFlashcardData` interface (currently at line 125):**
```ts
export interface AIFlashcardData {
  english: string
  italian: string
  synonyms_en: string
  synonyms_it: string
  examples_en: string
  examples_it: string
}
```

**Add `AIAudioEvalResult` after `AIEvalResult` (currently at line 132):**
```ts
export interface AIAudioEvalResult {
  english_correct: boolean
  italian_correct: boolean
  quality: number
  english_explanation: string
  italian_explanation: string
}
```

**In `IElectronAPI`, add two new methods after `evaluateAnswer`:**
```ts
  evaluateAudioAnswer: (word: string, userEnglish: string, userItalian: string) => Promise<AIAudioEvalResult>
  deleteFlashcard: (id: number) => Promise<void>
```

- [ ] **Step 2: Add DB migration for synonym columns**

In `src/main/db.ts`, add these two lines after the closing `\`\`\`)` of `db.exec(...)` (after line 66, before the closing `}` of `migrateDb`):

```ts
  try { db.exec('ALTER TABLE flashcards ADD COLUMN synonyms_en TEXT') } catch {}
  try { db.exec('ALTER TABLE flashcards ADD COLUMN synonyms_it TEXT') } catch {}
```

The try/catch is intentional — SQLite throws if the column already exists, so this makes the migration idempotent.

- [ ] **Step 3: Update the `save-flashcard` IPC handler**

In `src/main/ipc.ts`, replace the existing `save-flashcard` handler. It currently inserts 7 columns; update it to insert 9:

```ts
  ipcMain.handle('save-flashcard', (_e, c: FlashcardInput) =>
    db.prepare(
      'INSERT INTO flashcards (english, italian, synonyms_en, synonyms_it, examples_en, examples_it, next_review, created_at, source) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(c.english, c.italian, c.synonyms_en ?? null, c.synonyms_it ?? null, c.examples_en, c.examples_it, Date.now(), Date.now(), c.source ?? 'manual').lastInsertRowid
  )
```

- [ ] **Step 4: Update the `generate-flashcard` IPC handler**

In `src/main/ipc.ts`, replace the existing `generate-flashcard` handler (around line 185). The only change is the prompt and `max_tokens`:

```ts
  ipcMain.handle('generate-flashcard', async (_e, word: string) => {
    const msg = await anthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content:
        `Generate a flashcard for the English word: "${word}"\n\nReturn ONLY valid JSON, no markdown:\n{"english":"word","italian":"main translation","synonyms_en":"syn1, syn2, syn3","synonyms_it":"sin1, sin2, sin3","examples_en":"Ex 1\\n\\nEx 2\\n\\nEx 3","examples_it":"Es 1\\n\\nEs 2\\n\\nEs 3"}`
      }],
    })
    return JSON.parse((msg.content[0] as { text: string }).text.replace(/```json|```/g, '').trim())
  })
```

- [ ] **Step 5: Add `evaluate-audio-answer` and `delete-flashcard` IPC handlers**

In `src/main/ipc.ts`, add these two handlers after the `evaluate-answer` handler (after line ~205, before `evaluate-writing`):

```ts
  ipcMain.handle('evaluate-audio-answer', async (_e, word: string, userEnglish: string, userItalian: string) => {
    const msg = await anthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content:
        `Evaluate these two answers for the word "${word}":\nSpelling: "${userEnglish}" (correct: "${word}")\nTranslation: "${userItalian}"\n\nAccept minor spelling variants for the translation. Return ONLY valid JSON:\n{"english_correct":true,"italian_correct":true,"quality":5,"english_explanation":"brief","italian_explanation":"brief"}`
      }],
    })
    return JSON.parse((msg.content[0] as { text: string }).text.replace(/```json|```/g, '').trim())
  })

  ipcMain.handle('delete-flashcard', (_e, id: number) =>
    db.prepare('DELETE FROM flashcards WHERE id = ?').run(id)
  )
```

- [ ] **Step 6: Update preload to expose new IPC methods**

In `src/preload/index.ts`, add two entries to the `contextBridge.exposeInMainWorld` object (after the `evaluateAnswer` line):

```ts
  evaluateAudioAnswer: (word: string, userEnglish: string, userItalian: string) =>
    ipcRenderer.invoke('evaluate-audio-answer', word, userEnglish, userItalian),
  deleteFlashcard: (id: number) =>
    ipcRenderer.invoke('delete-flashcard', id),
```

- [ ] **Step 7: Run tests to verify no type errors broke anything**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm test 2>&1 | tail -10
```

Expected: same tests passing as before (6 flashcardUtils tests + existing tests)

- [ ] **Step 8: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/types/index.ts src/main/db.ts src/main/ipc.ts src/preload/index.ts && git commit -m "feat: add synonym columns, evaluate-audio-answer and delete-flashcard IPC"
```

---

### Task 3: FloatingFlashcardButton + AddCardModal + App.tsx wiring

The modal state lives in `App.tsx` because `FloatingFlashcardButton` is rendered outside any route and can't reach into `Flashcard.tsx`'s state.

**Files:**
- Modify: `src/renderer/src/components/FloatingFlashcardButton.tsx`
- Create: `src/renderer/src/components/flashcard/AddCardModal.tsx`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Update FloatingFlashcardButton to accept an onClick prop**

Replace the entire content of `src/renderer/src/components/FloatingFlashcardButton.tsx`:

```tsx
interface Props { onClick: () => void }

export function FloatingFlashcardButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-mauve text-base
        flex items-center justify-center text-xl shadow-lg hover:scale-110 transition-transform z-50"
      title="Aggiungi parola alle flashcard"
    >
      🃏
    </button>
  )
}
```

- [ ] **Step 2: Create AddCardModal**

Create `src/renderer/src/components/flashcard/AddCardModal.tsx`:

```tsx
import { useState } from 'react'
import type { AIFlashcardData, FlashcardInput } from '../../types'

interface Props { onClose: () => void }

type Phase = 'input' | 'loading' | 'preview' | 'saving'

export function AddCardModal({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('input')
  const [word, setWord] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AIFlashcardData>({
    english: '', italian: '', synonyms_en: '', synonyms_it: '', examples_en: '', examples_it: '',
  })

  async function handleGenerate() {
    if (!word.trim()) return
    setError(null)
    setPhase('loading')
    try {
      const result = await window.api.generateFlashcard(word.trim())
      setData(result)
      setPhase('preview')
    } catch {
      setError('Errore nella generazione. Riprova.')
      setPhase('input')
    }
  }

  async function handleSave() {
    setPhase('saving')
    try {
      const card: FlashcardInput = {
        english: data.english,
        italian: data.italian,
        synonyms_en: data.synonyms_en || null,
        synonyms_it: data.synonyms_it || null,
        examples_en: data.examples_en,
        examples_it: data.examples_it,
      }
      await window.api.saveFlashcard(card)
      onClose()
    } catch {
      setError('Errore nel salvataggio.')
      setPhase('preview')
    }
  }

  const fields: { label: string; key: keyof AIFlashcardData; multiline?: boolean }[] = [
    { label: 'Inglese', key: 'english' },
    { label: 'Italiano', key: 'italian' },
    { label: 'Sinonimi EN', key: 'synonyms_en' },
    { label: 'Sinonimi IT', key: 'synonyms_it' },
    { label: 'Esempi EN', key: 'examples_en', multiline: true },
    { label: 'Esempi IT', key: 'examples_it', multiline: true },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm">
      <div className="bg-mantle border border-surface0 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">Aggiungi flashcard</h2>
          <button
            onClick={onClose}
            className="text-subtext0 hover:text-text transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {phase === 'input' && (
          <div className="flex flex-col gap-3">
            {error && <p className="text-sm text-red">{error}</p>}
            <input
              type="text"
              value={word}
              onChange={e => setWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="Parola inglese..."
              autoFocus
              className="bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                placeholder:text-subtext0 outline-none focus:border-mauve transition-colors"
            />
            <button
              onClick={handleGenerate}
              disabled={!word.trim()}
              className="px-4 py-2 bg-mauve text-base rounded-lg text-sm font-medium
                hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Genera ✨
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <p className="text-sm text-subtext0 animate-pulse text-center py-6">Generazione in corso…</p>
        )}

        {(phase === 'preview' || phase === 'saving') && (
          <div className="flex flex-col gap-3">
            {error && <p className="text-sm text-red">{error}</p>}
            {fields.map(({ label, key, multiline }) => (
              <div key={key}>
                <label className="text-xs text-subtext0 mb-1 block">{label}</label>
                {multiline ? (
                  <textarea
                    value={data[key]}
                    onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
                    rows={3}
                    className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                      outline-none focus:border-mauve transition-colors resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={data[key]}
                    onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
                    className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                      outline-none focus:border-mauve transition-colors"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-surface0 text-subtext0 hover:text-text rounded-lg text-sm transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={phase === 'saving'}
                className="px-4 py-2 bg-mauve text-base rounded-lg text-sm font-medium
                  hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {phase === 'saving' ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update App.tsx to lift modal state**

Replace the entire `src/renderer/src/App.tsx`:

```tsx
import { useState } from 'react'
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
        <FloatingFlashcardButton onClick={() => setFlashModalOpen(true)} />
        {flashModalOpen && <AddCardModal onClose={() => setFlashModalOpen(false)} />}
      </div>
    </HashRouter>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm test 2>&1 | tail -10
```

Expected: all tests still passing

- [ ] **Step 5: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/components/FloatingFlashcardButton.tsx src/renderer/src/components/flashcard/AddCardModal.tsx src/renderer/src/App.tsx && git commit -m "feat: wire FloatingFlashcardButton to AddCardModal via App.tsx"
```

---

### Task 4: CardLibrary

**Files:**
- Create: `src/renderer/src/components/flashcard/CardLibrary.tsx`

- [ ] **Step 1: Create CardLibrary**

Create `src/renderer/src/components/flashcard/CardLibrary.tsx`:

```tsx
import { useState, useEffect } from 'react'
import type { Flashcard } from '../../types'

interface Props { onStartReview: () => void }

export function CardLibrary({ onStartReview }: Props) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setError(null)
    setCards([])
    setLoading(true)
    window.api.getFlashcards()
      .then(setCards)
      .catch(() => setError('Errore nel caricamento delle card.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: number) {
    await window.api.deleteFlashcard(id)
    setCards(cs => cs.filter(c => c.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext0 text-sm animate-pulse">Caricamento…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 pt-10">
        <p className="text-red text-sm">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1">
          Riprova
        </button>
      </div>
    )
  }

  const now = Date.now()
  const dueCount = cards.filter(c => c.next_review <= now).length

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <span className="text-sm text-subtext0">
          {cards.length} card
          {dueCount > 0 && <span className="text-yellow"> · {dueCount} in scadenza</span>}
        </span>
        <button
          onClick={onStartReview}
          disabled={dueCount === 0}
          className="px-4 py-1.5 bg-mauve text-base rounded text-sm font-medium
            hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Inizia ripasso ▶
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="text-subtext0 text-sm text-center pt-10">
          Aggiungi la tua prima parola con il bottone 🃏
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {cards.map(card => {
            const due = card.next_review <= now
            const firstSynonymIt = card.synonyms_it?.split(', ')[0] ?? null
            return (
              <div
                key={card.id}
                className="flex items-center justify-between bg-surface0/30 border border-surface0
                  rounded-lg px-4 py-3 hover:border-surface1 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-text">{card.english}</span>
                  <span className="text-xs text-subtext0 ml-2 truncate">
                    {card.italian}{firstSynonymIt ? ` · ${firstSynonymIt}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {due
                    ? <span className="text-xs bg-yellow/20 text-yellow px-2 py-0.5 rounded">oggi</span>
                    : <span className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded">inter. {card.interval}</span>
                  }
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="text-subtext0 hover:text-red transition-colors text-sm px-1"
                    title="Elimina"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm test 2>&1 | tail -10
```

Expected: all tests passing

- [ ] **Step 3: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/components/flashcard/CardLibrary.tsx && git commit -m "feat: add CardLibrary component"
```

---

### Task 5: ReviewSession

**Files:**
- Create: `src/renderer/src/components/flashcard/ReviewSession.tsx`

- [ ] **Step 1: Create ReviewSession**

Create `src/renderer/src/components/flashcard/ReviewSession.tsx`:

```tsx
import { useState, useEffect } from 'react'
import type { Flashcard, AIEvalResult, AIAudioEvalResult, ReviewInput } from '../../types'
import { pickMode, computeQualityFromDual } from './flashcardUtils'
import type { ReviewMode } from './flashcardUtils'

type Phase = 'loading' | 'error' | 'idle' | 'reviewing' | 'evaluating' | 'result' | 'done'

interface EvalState {
  textResult: AIEvalResult | null
  audioResult: AIAudioEvalResult | null
  aiError: boolean
}

function speak(word: string) {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-GB'
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}

export function ReviewSession() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [cards, setCards] = useState<Flashcard[]>([])
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<ReviewMode>('text-en-it')
  const [textInput, setTextInput] = useState('')
  const [audioEnInput, setAudioEnInput] = useState('')
  const [audioItInput, setAudioItInput] = useState('')
  const [evalState, setEvalState] = useState<EvalState>({ textResult: null, audioResult: null, aiError: false })
  const [saveError, setSaveError] = useState(false)

  function load() {
    setPhase('loading')
    window.api.getDueFlashcards()
      .then(due => {
        setCards(due)
        if (due.length === 0) {
          setPhase('idle')
        } else {
          setIndex(0)
          setMode(pickMode())
          setPhase('reviewing')
        }
      })
      .catch(() => setPhase('error'))
  }

  useEffect(() => { load() }, [])

  const card = cards[index]

  useEffect(() => {
    if (phase === 'reviewing' && mode === 'audio' && card) {
      speak(card.english)
    }
  }, [phase, mode, index])

  async function handleSubmit() {
    if (!card) return
    setPhase('evaluating')
    const newEval: EvalState = { textResult: null, audioResult: null, aiError: false }
    try {
      if (mode === 'audio') {
        newEval.audioResult = await window.api.evaluateAudioAnswer(card.english, audioEnInput, audioItInput)
      } else {
        const correct = mode === 'text-en-it' ? card.italian : card.english
        const direction = mode === 'text-en-it' ? 'en-it' : 'it-en'
        newEval.textResult = await window.api.evaluateAnswer(card.english, correct, textInput, direction)
      }
    } catch {
      newEval.aiError = true
    }
    setEvalState(newEval)
    setPhase('result')
  }

  async function handleNext() {
    if (!card) return
    setSaveError(false)

    const quality = evalState.aiError
      ? 3
      : evalState.audioResult
        ? computeQualityFromDual(evalState.audioResult.english_correct, evalState.audioResult.italian_correct)
        : evalState.textResult?.quality ?? 3

    const isCorrect = evalState.aiError
      ? false
      : evalState.audioResult
        ? evalState.audioResult.english_correct && evalState.audioResult.italian_correct
        : evalState.textResult?.is_correct ?? false

    const direction: ReviewInput['direction'] =
      mode === 'audio' ? 'audio' : mode === 'text-en-it' ? 'en-it' : 'it-en'

    const userAnswer = mode === 'audio'
      ? `${audioEnInput} / ${audioItInput}`
      : textInput

    try {
      await window.api.updateFlashcardSM2(card.id, quality)
      await window.api.saveFlashcardReview({
        flashcard_id: card.id,
        reviewed_at: Date.now(),
        direction,
        user_answer: userAnswer,
        quality,
        is_correct: isCorrect,
      })
    } catch {
      setSaveError(true)
    }

    const nextIndex = index + 1
    if (nextIndex >= cards.length) {
      setPhase('done')
      return
    }

    setIndex(nextIndex)
    setMode(pickMode())
    setTextInput('')
    setAudioEnInput('')
    setAudioItInput('')
    setEvalState({ textResult: null, audioResult: null, aiError: false })
    setPhase('reviewing')
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext0 text-sm animate-pulse">Caricamento…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 pt-10">
        <p className="text-red text-sm">Errore nel caricamento delle card.</p>
        <button onClick={load} className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1">
          Riprova
        </button>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext0 text-sm">Nessuna card da ripassare oggi 🎉</p>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-3xl">🎉</p>
        <p className="text-text font-medium">{cards.length} card ripassate!</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-surface0 text-subtext0 hover:text-text rounded text-sm transition-colors"
        >
          Ricarica
        </button>
      </div>
    )
  }

  if (!card) return null

  const canSubmit = mode === 'audio'
    ? audioEnInput.trim() !== '' && audioItInput.trim() !== ''
    : textInput.trim() !== ''

  // ── Reviewing / Evaluating ────────────────────────────────────────────────────
  if (phase === 'reviewing' || phase === 'evaluating') {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <span className="text-xs text-subtext0">{index + 1} / {cards.length}</span>
          <div className="flex-1 h-1 bg-surface0 rounded-full overflow-hidden">
            <div
              className="h-full bg-mauve rounded-full transition-all"
              style={{ width: `${((index + 1) / cards.length) * 100}%` }}
            />
          </div>
        </div>

        {mode === 'audio' ? (
          <div
            onClick={() => speak(card.english)}
            className="flex-1 flex flex-col items-center justify-center gap-3 bg-surface0/30
              border border-blue/30 rounded-xl cursor-pointer hover:border-blue/60 transition-colors mb-4"
          >
            <span className="text-4xl">🔊</span>
            <span className="text-sm text-blue font-medium">Clicca per risentire</span>
            <span className="text-xs text-subtext0">Scrivi la parola che senti</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-surface0/30 border border-surface0 rounded-xl mb-4">
            <span className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded">
              {mode === 'text-en-it' ? '🔤 en → it' : '🔤 it → en'}
            </span>
            <span className="text-3xl font-bold text-text">
              {mode === 'text-en-it' ? card.english : card.italian}
            </span>
            <span className="text-xs text-subtext0">
              {mode === 'text-en-it' ? 'Scrivi la traduzione italiana' : 'Scrivi la traduzione inglese'}
            </span>
            <button
              onClick={() => speak(card.english)}
              className="flex items-center gap-1.5 text-xs text-blue bg-surface0 px-3 py-1
                rounded-full hover:bg-surface1 transition-colors"
            >
              🔊 Ascolta pronuncia
            </button>
          </div>
        )}

        {mode === 'audio' ? (
          <div className="flex gap-3 mb-3 shrink-0">
            <div className="flex-1">
              <label className="text-xs text-subtext0 mb-1 block">Parola inglese</label>
              <input
                type="text"
                value={audioEnInput}
                onChange={e => setAudioEnInput(e.target.value)}
                disabled={phase === 'evaluating'}
                placeholder="Spelling..."
                className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                  placeholder:text-subtext0 outline-none focus:border-mauve transition-colors disabled:opacity-50"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-subtext0 mb-1 block">Traduzione italiana</label>
              <input
                type="text"
                value={audioItInput}
                onChange={e => setAudioItInput(e.target.value)}
                disabled={phase === 'evaluating'}
                placeholder="Traduzione..."
                className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                  placeholder:text-subtext0 outline-none focus:border-mauve transition-colors disabled:opacity-50"
              />
            </div>
          </div>
        ) : (
          <div className="mb-3 shrink-0">
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit && phase === 'reviewing') handleSubmit() }}
              disabled={phase === 'evaluating'}
              placeholder={mode === 'text-en-it' ? 'Traduzione italiana...' : 'English translation...'}
              autoFocus
              className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                placeholder:text-subtext0 outline-none focus:border-mauve transition-colors disabled:opacity-50"
            />
          </div>
        )}

        <div className="flex justify-end shrink-0">
          {phase === 'evaluating' ? (
            <span className="text-sm text-subtext0 animate-pulse">Valutazione in corso…</span>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-5 py-2 bg-mauve text-base rounded-lg text-sm font-medium
                hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Valuta ▶
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────────
  const synonymsEn = card.synonyms_en?.split(', ').filter(Boolean) ?? []
  const synonymsIt = card.synonyms_it?.split(', ').filter(Boolean) ?? []
  const examplesEn = card.examples_en?.split('\n\n').filter(Boolean) ?? []
  const examplesIt = card.examples_it?.split('\n\n').filter(Boolean) ?? []

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <span className="text-xs text-subtext0">{index + 1} / {cards.length}</span>
        <div className="flex-1 h-1 bg-surface0 rounded-full overflow-hidden">
          <div className="h-full bg-mauve rounded-full" style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
        </div>
      </div>

      {evalState.aiError && (
        <div className="mb-3 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-xs shrink-0">
          ⚠ Valutazione AI non disponibile
        </div>
      )}
      {saveError && (
        <div className="mb-3 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-xs shrink-0">
          ⚠ Salvataggio non riuscito
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-surface0/30 border border-surface0 rounded-xl p-4 mb-4 min-h-0">
        {evalState.textResult && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-text">
                {mode === 'text-en-it'
                  ? `${card.english} → ${card.italian}`
                  : `${card.italian} → ${card.english}`}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                evalState.textResult.is_correct ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
              }`}>
                {evalState.textResult.is_correct ? '✓ Corretto' : '✗ Sbagliato'}
              </span>
            </div>
            <p className="text-xs text-subtext0 mb-3">{evalState.textResult.explanation}</p>
          </>
        )}

        {evalState.audioResult && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-subtext0 w-20 shrink-0">Spelling:</span>
              <span className="text-sm font-medium text-text">{card.english}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                evalState.audioResult.english_correct ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
              }`}>
                {evalState.audioResult.english_correct ? '✓' : '✗'}
              </span>
            </div>
            <p className="text-xs text-subtext0 mb-2">{evalState.audioResult.english_explanation}</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-subtext0 w-20 shrink-0">Traduzione:</span>
              <span className="text-sm font-medium text-text">{card.italian}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                evalState.audioResult.italian_correct ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
              }`}>
                {evalState.audioResult.italian_correct ? '✓' : '✗'}
              </span>
            </div>
            <p className="text-xs text-subtext0 mb-3">{evalState.audioResult.italian_explanation}</p>
          </>
        )}

        {evalState.aiError && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-text">{card.english} → {card.italian}</span>
          </div>
        )}

        {synonymsEn.length > 0 && (
          <>
            <p className="text-xs text-subtext0 uppercase tracking-wider mb-1.5">Sinonimi EN</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {synonymsEn.map(s => (
                <span key={s} className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </>
        )}
        {synonymsIt.length > 0 && (
          <>
            <p className="text-xs text-subtext0 uppercase tracking-wider mb-1.5">Sinonimi IT</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {synonymsIt.map(s => (
                <span key={s} className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </>
        )}

        {examplesEn.length > 0 && (
          <>
            <div className="h-px bg-surface0 mb-3" />
            <p className="text-xs text-subtext0 uppercase tracking-wider mb-2">Esempi</p>
            {examplesEn.map((ex, i) => (
              <div key={i} className="mb-2">
                <p className="text-xs text-text">{ex}</p>
                {examplesIt[i] && <p className="text-xs text-subtext0">{examplesIt[i]}</p>}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="flex justify-end shrink-0">
        <button
          onClick={handleNext}
          className="px-5 py-2 bg-surface0 text-text rounded-lg text-sm hover:bg-surface1 transition-colors"
        >
          {index + 1 < cards.length ? 'Avanti →' : 'Fine ✓'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm test 2>&1 | tail -10
```

Expected: all tests passing

- [ ] **Step 3: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/components/flashcard/ReviewSession.tsx && git commit -m "feat: add ReviewSession component — text/audio modes, SM-2 loop, TTS"
```

---

### Task 6: Flashcard page

**Files:**
- Modify: `src/renderer/src/pages/Flashcard.tsx`

- [ ] **Step 1: Replace the placeholder Flashcard page**

Replace the entire content of `src/renderer/src/pages/Flashcard.tsx`:

```tsx
import { useState } from 'react'
import { ReviewSession } from '../components/flashcard/ReviewSession'
import { CardLibrary } from '../components/flashcard/CardLibrary'

type Tab = 'review' | 'library'

export function Flashcard() {
  const [activeTab, setActiveTab] = useState<Tab>('review')

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-surface0 shrink-0">
        <h1 className="text-xl font-bold text-text">Flashcard</h1>
        <div className="flex gap-2 mt-3">
          {(['review', 'library'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                activeTab === t
                  ? 'bg-mauve text-base font-medium'
                  : 'bg-surface0 text-subtext0 hover:text-text'
              }`}
            >
              {t === 'review' ? 'Ripasso' : 'Le mie card'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'review'
          ? <ReviewSession />
          : <CardLibrary onStartReview={() => setActiveTab('review')} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests — final check**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm test 2>&1 | tail -20
```

Expected: all tests passing. Count should be ≥ 56 (50 from previous plans + 6 new flashcardUtils tests).

- [ ] **Step 3: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/pages/Flashcard.tsx && git commit -m "feat: implement Flashcard page — review + library tabs"
```
