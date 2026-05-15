# Plan 5 — Flashcards UI Design

**Goal:** Implement the `/flashcards` page with a full SM-2 review session (text and audio modes) and a card library, plus wire up the existing `FloatingFlashcardButton` to open an add-card modal.

**Architecture:** One page component (`Flashcard.tsx`) with two tabs — Ripasso and Le mie card — delegating to three sub-components. Two new IPC methods. One DB migration adding synonym columns. Pure utility functions for mode selection and quality computation covered by unit tests.

**Tech Stack:** React 18 + TypeScript, Tailwind v4 (Catppuccin Mocha), Web Speech API (`window.speechSynthesis`) for TTS, existing IPC (`getDueFlashcards`, `getFlashcards`, `saveFlashcard`, `updateFlashcardSM2`, `saveFlashcardReview`, `generateFlashcard`), new IPC (`evaluateAudioAnswer`), Claude Haiku for AI evaluation and card generation, react-router-dom `useNavigate`.

---

## 1. File Structure

### New files
```
src/renderer/src/components/flashcard/ReviewSession.tsx   — review session (text + audio modes)
src/renderer/src/components/flashcard/CardLibrary.tsx     — library tab (list + delete)
src/renderer/src/components/flashcard/AddCardModal.tsx    — add card modal (AI generation + preview)
src/renderer/src/components/flashcard/flashcardUtils.ts   — pickMode, computeQualityFromDual
src/tests/flashcardUtils.test.ts                          — unit tests for both utilities
```

### Modified files
```
src/renderer/src/pages/Flashcard.tsx                      — two-tab page (replaces placeholder)
src/renderer/src/components/FloatingFlashcardButton.tsx   — onClick opens AddCardModal
src/main/db.ts                                            — migration: synonyms_en, synonyms_it columns
src/main/ipc.ts                                           — update generate-flashcard prompt + add evaluate-audio-answer
src/preload/index.ts                                      — expose evaluateAudioAnswer
src/renderer/src/types/index.ts                           — update Flashcard, AIFlashcardData; add AIAudioEvalResult
```

---

## 2. DB Migration

Added to `migrateDb()` in `src/main/db.ts` (safe — uses `IF NOT EXISTS` equivalent via try/catch on ALTER):

```sql
ALTER TABLE flashcards ADD COLUMN synonyms_en TEXT;
ALTER TABLE flashcards ADD COLUMN synonyms_it TEXT;
```

Both columns are nullable so existing cards without synonyms continue to work. Existing cards show no synonym pills at result time.

---

## 3. Types

```ts
// Updated
export interface Flashcard {
  id: number
  english: string
  italian: string
  synonyms_en: string | null   // comma-separated, e.g. "articulate, fluent"
  synonyms_it: string | null   // comma-separated, e.g. "forbito, articolato"
  examples_en: string
  examples_it: string
  interval: number
  ease_factor: number
  repetitions: number
  next_review: number
  created_at: number
  source: string
}

// Updated
export interface AIFlashcardData {
  english: string
  italian: string
  synonyms_en: string   // comma-separated
  synonyms_it: string   // comma-separated
  examples_en: string
  examples_it: string
}

// New
export interface AIAudioEvalResult {
  english_correct: boolean
  italian_correct: boolean
  quality: number          // 0–5, combined score for SM-2
  english_explanation: string
  italian_explanation: string
}
```

---

## 4. Utility Functions

**`src/renderer/src/components/flashcard/flashcardUtils.ts`:**

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

**Tests** (`src/tests/flashcardUtils.test.ts`, Vitest node env):
- `pickMode()` always returns one of the three valid values (run 100 times, check Set size ≤ 3)
- `computeQualityFromDual(true, true)` → `5`
- `computeQualityFromDual(true, false)` → `3`
- `computeQualityFromDual(false, true)` → `3`
- `computeQualityFromDual(false, false)` → `1`

---

## 5. IPC Changes

### `generate-flashcard` — updated prompt

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

### `evaluate-audio-answer` — new handler

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
```

`preload/index.ts` additions:
```ts
evaluateAudioAnswer: (word: string, userEnglish: string, userItalian: string) =>
  ipcRenderer.invoke('evaluate-audio-answer', word, userEnglish, userItalian),
deleteFlashcard: (id: number) =>
  ipcRenderer.invoke('delete-flashcard', id),
```

---

## 6. `Flashcard.tsx` — Page

Two-tab layout. Manages `activeTab`, `modalOpen` state. Passes `onAddCard` callback down to allow `CardLibrary` to trigger the modal via the "Inizia ripasso" button navigating correctly.

```tsx
type Tab = 'review' | 'library'

export function Flashcard() {
  const [activeTab, setActiveTab] = useState<Tab>('review')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface0 shrink-0">
        <h1 className="text-xl font-bold text-text">Flashcard</h1>
        <div className="flex gap-2 mt-3">
          {(['review', 'library'] as Tab[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                activeTab === t ? 'bg-mauve text-base font-medium' : 'bg-surface0 text-subtext0 hover:text-text'
              }`}>
              {t === 'review' ? 'Ripasso' : 'Le mie card'}
            </button>
          ))}
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'review'
          ? <ReviewSession />
          : <CardLibrary onStartReview={() => setActiveTab('review')} />}
      </div>
      {/* Modal */}
      {modalOpen && <AddCardModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
```

`FloatingFlashcardButton` receives `onClick` from `App.tsx` via props — see Section 11.

---

## 7. `ReviewSession.tsx`

**State:**
```ts
type Phase = 'loading' | 'idle' | 'reviewing' | 'result' | 'done'
```

**On mount:** `window.api.getDueFlashcards()` → if empty, show idle ("Nessuna card da ripassare oggi").

**Review loop:**
1. Pick next card from due list, call `pickMode()` → `ReviewMode`
2. If `audio`: call `speak(card.english)` on mount
3. If `text-en-it`: show `card.english`, input for Italian
4. If `text-it-en`: show `card.italian`, input for English
5. Submit → call appropriate evaluate IPC → set phase `'result'`
6. Show result (see Section 8)
7. User clicks "Avanti" → `updateFlashcardSM2` + `saveFlashcardReview` → advance index
8. When all cards done → phase `'done'`, show summary (X card ripassate)

**TTS helper** (defined inside the file, not exported):
```ts
function speak(word: string) {
  window.speechSynthesis.cancel()   // stop any previous utterance
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-GB'
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}
```

**AI failure fallback:** if `evaluate-answer` or `evaluate-audio-answer` rejects, treat as `is_correct: false, quality: 3` and show "Valutazione AI non disponibile" warning (yellow banner, same pattern as WritingFeedback).

---

## 8. Result Display

Shown after AI evaluation, before "Avanti":

- Word + translation + correct/incorrect badge
- AI explanation (1 line)
- **Sinonimi EN** — `card.synonyms_en?.split(', ')` mapped to pills (hidden if null/empty)
- **Sinonimi IT** — `card.synonyms_it?.split(', ')` mapped to pills (hidden if null/empty)
- **Esempi** — `card.examples_en` / `card.examples_it` split on `\n\n`, shown as pairs

For audio mode: two result rows (spelling + translation) each with their own badge.

---

## 9. `CardLibrary.tsx`

**Data:** `window.api.getFlashcards()` on mount (all cards, not just due).

**Layout:**
- Top bar: `"N card · M in scadenza oggi"` + `"Inizia ripasso ▶"` button (calls `onStartReview` prop)
- Scrollable list: each row shows `english`, `italian · first synonym if present`, interval badge or "oggi" badge, delete button
- Delete: `window.api.deleteFlashcard(id)` — new IPC (see below), then remove from local state

**New IPC needed — `delete-flashcard`:**
```ts
ipcMain.handle('delete-flashcard', (_e, id: number) =>
  db.prepare('DELETE FROM flashcards WHERE id = ?').run(id)
)
```

**Empty state:** "Aggiungi la tua prima parola con il bottone 🃏"

---

## 10. `AddCardModal.tsx`

Triggered by `FloatingFlashcardButton`. Since the button is rendered in `App.tsx` outside the `Flashcard` route, it needs access to a setter. Solution: lift `modalOpen` state into `App.tsx` and pass `setModalOpen` to `FloatingFlashcardButton` via props.

**Phases:** `'input' | 'loading' | 'preview' | 'saving'`

1. **Input:** text input for English word + "Genera" button
2. **Loading:** spinner "Generazione in corso…"
3. **Preview:** all fields editable (english, italian, synonyms_en, synonyms_it, examples_en, examples_it) + "Salva" button
4. **Saving:** call `saveFlashcard(card)` → close modal on success

**Error:** if `generateFlashcard` fails → error message + "Riprova" button back to input phase.

---

## 11. `FloatingFlashcardButton.tsx`

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

`App.tsx` change: add `const [flashModalOpen, setFlashModalOpen] = useState(false)` and pass `onClick={() => setFlashModalOpen(true)}` to the button, render `<AddCardModal>` when open.

---

## 12. Error Handling

| Scenario | Behavior |
|---|---|
| `getDueFlashcards` fails | Error message + "Riprova" button |
| `getFlashcards` fails | Error message + "Riprova" button |
| `generateFlashcard` fails | Error in modal + "Riprova" button |
| `evaluate-answer` fails | quality=3, yellow banner "Valutazione AI non disponibile" |
| `evaluate-audio-answer` fails | quality=3, yellow banner, no per-field feedback |
| `saveFlashcard` fails | Error in modal, stay open |
| TTS not available | Silently skipped (no error shown — browser falls back gracefully) |

---

## 13. Testing

**`src/tests/flashcardUtils.test.ts`** (Vitest, node env):
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
