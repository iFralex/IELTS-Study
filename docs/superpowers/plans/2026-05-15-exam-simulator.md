# Exam Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `ExamSimulator.tsx` with a full IELTS mock exam — selectable sections, visible elapsed timer with automatic snapshot at IELTS standard times, AI evaluation for Writing, and a "Ultime simulazioni" section on the Dashboard.

**Architecture:** `ExamSimulator.tsx` orchestrates a section queue (Listening → Reading → Writing) via refs to avoid stale closures; three dedicated section components reuse existing leaf components (`AudioPlayer`, `ReadingPassage`, `QuestionInput`, `WritingEditor`); results collected in refs, saved via existing IPC. Dashboard gets a third Promise in its load call.

**Tech Stack:** React 18 + TypeScript, Tailwind v4 Catppuccin Mocha, existing IPC (`getExercises`, `saveSession`, `saveWritingSubmission`, `saveExamRun`, `getExamRuns`, `evaluateWriting`), existing utilities (`scoreAnswers` from `components/practice/utils.ts`, `countWords` from `components/practice/writingUtils.ts`).

---

## File Structure

```
src/renderer/src/components/exam/ExamListeningSection.tsx  — NEW
src/renderer/src/components/exam/ExamReadingSection.tsx    — NEW
src/renderer/src/components/exam/ExamWritingSection.tsx    — NEW
src/renderer/src/pages/ExamSimulator.tsx                   — REPLACE placeholder
src/renderer/src/pages/Dashboard.tsx                       — ADD "Ultime simulazioni"
```

---

### Task 1: ExamListeningSection

**Files:**
- Create: `src/renderer/src/components/exam/ExamListeningSection.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useEffect, useRef } from 'react'
import type { ListeningExercise } from '../../types'
import { AudioPlayer } from '../practice/AudioPlayer'
import { QuestionInput } from '../practice/QuestionInput'

export interface ListeningResult {
  exercise: ListeningExercise | null
  answers: Record<number, string>
  snapshotAnswers: Record<number, string> | null
  elapsedSeconds: number
}

const TARGET_SECONDS = 2400 // 40 min

interface Props {
  onComplete: (result: ListeningResult) => void
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function ExamListeningSection({ onComplete }: Props) {
  const [exercise, setExercise] = useState<ListeningExercise | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const [snapshotTaken, setSnapshotTaken] = useState(false)
  const snapshotRef = useRef<Record<number, string> | null>(null)
  const answersRef = useRef<Record<number, string>>({})

  function load() {
    setLoadError(false)
    ;(window.api.getExercises('listening') as Promise<ListeningExercise[]>)
      .then(exs => {
        if (exs.length === 0) { setLoadError(true); return }
        setExercise(exs[Math.floor(Math.random() * exs.length)])
      })
      .catch(() => setLoadError(true))
  }

  useEffect(() => { load() }, [])

  useEffect(() => { answersRef.current = answers }, [answers])

  useEffect(() => {
    if (!exercise) return
    const id = setInterval(() => {
      setElapsed(s => {
        const next = s + 1
        if (next === TARGET_SECONDS && snapshotRef.current === null) {
          snapshotRef.current = { ...answersRef.current }
          setSnapshotTaken(true)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [exercise])

  function handleComplete() {
    onComplete({ exercise, answers, snapshotAnswers: snapshotRef.current, elapsedSeconds: elapsed })
  }

  function handleSkip() {
    onComplete({ exercise: null, answers: {}, snapshotAnswers: null, elapsedSeconds: elapsed })
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-red text-sm">Errore nel caricamento dell'esercizio Listening.</p>
        <button onClick={load}
          className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors">
          Riprova
        </button>
        <button onClick={handleSkip} className="text-subtext0 text-sm underline">
          Salta sezione
        </button>
      </div>
    )
  }

  if (!exercise) {
    return <p className="p-8 text-subtext0 text-sm text-center">Caricamento esercizio…</p>
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Timer bar */}
      <div className="px-6 py-2 bg-surface0/50 border-b border-surface0 flex items-center justify-between shrink-0">
        <span className="text-xs text-subtext0 truncate">{exercise.title}</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-mono font-semibold text-text">{fmtSec(elapsed)}</span>
          {snapshotTaken
            ? <span className="text-xs text-yellow bg-yellow/10 px-2 py-0.5 rounded-full">📸 snapshot a 40:00</span>
            : <span className="text-xs text-subtext0">/ 40:00 target</span>}
        </div>
      </div>

      {/* Audio player */}
      <AudioPlayer audioUrl={exercise.audio_url} title={exercise.title} sourceUrl={exercise.source_url} />

      {/* Questions */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3 max-w-2xl mx-auto">
          {exercise.questions.map(q => (
            <div key={q.index} className="bg-surface0/30 border border-surface0 rounded-lg p-3">
              <p className="text-sm text-text mb-2">{q.index + 1}. {q.text}</p>
              <QuestionInput
                question={q}
                questionType={exercise.question_type}
                value={answers[q.index] ?? ''}
                onChange={v => setAnswers(a => ({ ...a, [q.index]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-surface0 flex justify-between shrink-0">
        <button onClick={handleSkip}
          className="px-4 py-2 bg-surface0 text-subtext0 rounded text-sm hover:text-text transition-colors">
          Salta sezione →
        </button>
        <button onClick={handleComplete}
          className="px-4 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors">
          Sezione successiva ▶
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `ExamListeningSection.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/components/exam/ExamListeningSection.tsx && git commit -m "feat: add ExamListeningSection with timer and snapshot"
```

---

### Task 2: ExamReadingSection

**Files:**
- Create: `src/renderer/src/components/exam/ExamReadingSection.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useEffect, useRef } from 'react'
import type { ReadingExercise } from '../../types'
import { ReadingPassage } from '../practice/ReadingPassage'
import { QuestionInput } from '../practice/QuestionInput'

export interface ReadingResult {
  exercise: ReadingExercise | null
  answers: Record<number, string>
  snapshotAnswers: Record<number, string> | null
  elapsedSeconds: number
}

const TARGET_SECONDS = 3600 // 60 min

interface Props {
  onComplete: (result: ReadingResult) => void
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function ExamReadingSection({ onComplete }: Props) {
  const [exercise, setExercise] = useState<ReadingExercise | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const [snapshotTaken, setSnapshotTaken] = useState(false)
  const snapshotRef = useRef<Record<number, string> | null>(null)
  const answersRef = useRef<Record<number, string>>({})

  function load() {
    setLoadError(false)
    ;(window.api.getExercises('reading') as Promise<ReadingExercise[]>)
      .then(exs => {
        if (exs.length === 0) { setLoadError(true); return }
        setExercise(exs[Math.floor(Math.random() * exs.length)])
      })
      .catch(() => setLoadError(true))
  }

  useEffect(() => { load() }, [])

  useEffect(() => { answersRef.current = answers }, [answers])

  useEffect(() => {
    if (!exercise) return
    const id = setInterval(() => {
      setElapsed(s => {
        const next = s + 1
        if (next === TARGET_SECONDS && snapshotRef.current === null) {
          snapshotRef.current = { ...answersRef.current }
          setSnapshotTaken(true)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [exercise])

  function handleComplete() {
    onComplete({ exercise, answers, snapshotAnswers: snapshotRef.current, elapsedSeconds: elapsed })
  }

  function handleSkip() {
    onComplete({ exercise: null, answers: {}, snapshotAnswers: null, elapsedSeconds: elapsed })
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-red text-sm">Errore nel caricamento dell'esercizio Reading.</p>
        <button onClick={load}
          className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors">
          Riprova
        </button>
        <button onClick={handleSkip} className="text-subtext0 text-sm underline">
          Salta sezione
        </button>
      </div>
    )
  }

  if (!exercise) {
    return <p className="p-8 text-subtext0 text-sm text-center">Caricamento esercizio…</p>
  }

  const paragraphLabels = exercise.passage
    .split('\n\n')
    .map((_, i) => String.fromCharCode(65 + i))

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Timer bar */}
      <div className="px-6 py-2 bg-surface0/50 border-b border-surface0 flex items-center justify-between shrink-0">
        <span className="text-xs text-subtext0 truncate">{exercise.title}</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-mono font-semibold text-text">{fmtSec(elapsed)}</span>
          {snapshotTaken
            ? <span className="text-xs text-yellow bg-yellow/10 px-2 py-0.5 rounded-full">📸 snapshot a 1:00:00</span>
            : <span className="text-xs text-subtext0">/ 1:00:00 target</span>}
        </div>
      </div>

      {/* Split: passage left, questions right */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[55%] h-full border-r border-surface0 overflow-hidden flex flex-col">
          <ReadingPassage exercise={exercise} />
        </div>
        <div className="w-[45%] h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-5">
              {exercise.questions.map(q => (
                <div key={q.index} className="flex flex-col gap-2">
                  <label className="text-sm text-text font-medium leading-snug">
                    {q.index + 1}.{' '}
                    {exercise.question_type === 'matching_headings' && q.paragraph
                      ? `Paragraph ${q.paragraph}: `
                      : ''}
                    {q.text}
                  </label>
                  <QuestionInput
                    question={q}
                    questionType={exercise.question_type}
                    value={answers[q.index] ?? ''}
                    onChange={v => setAnswers(a => ({ ...a, [q.index]: v }))}
                    paragraphLabels={paragraphLabels}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="px-5 py-4 border-t border-surface0 flex justify-between shrink-0">
            <button onClick={handleSkip}
              className="px-4 py-2 bg-surface0 text-subtext0 rounded text-sm hover:text-text transition-colors">
              Salta sezione →
            </button>
            <button onClick={handleComplete}
              className="px-4 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors">
              Sezione successiva ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/components/exam/ExamReadingSection.tsx && git commit -m "feat: add ExamReadingSection with timer and snapshot"
```

---

### Task 3: ExamWritingSection

**Files:**
- Create: `src/renderer/src/components/exam/ExamWritingSection.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useEffect, useRef } from 'react'
import type { WritingTask1, WritingTask2 } from '../../types'
import { WritingEditor } from '../practice/WritingEditor'

export interface WritingSubResult {
  exercise: WritingTask1 | WritingTask2
  text: string
  snapshotText: string | null  // text at target time
  elapsedSeconds: number
}

export interface WritingResult {
  t1: WritingSubResult
  t2: WritingSubResult
}

const T1_TARGET = 1200  // 20 min
const T2_TARGET = 2400  // 40 min

type InnerPhase = 'loading' | 'error' | 't1' | 't2'

interface Props {
  onComplete: (result: WritingResult) => void
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function ExamWritingSection({ onComplete }: Props) {
  const [innerPhase, setInnerPhase] = useState<InnerPhase>('loading')
  const [t1Exercise, setT1Exercise] = useState<WritingTask1 | null>(null)
  const [t2Exercise, setT2Exercise] = useState<WritingTask2 | null>(null)
  const [t1Text, setT1Text] = useState('')
  const [t2Text, setT2Text] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [snapshotTaken, setSnapshotTaken] = useState(false)

  // Refs to avoid stale closures in timer
  const t1SnapshotRef = useRef<string | null>(null)
  const t2SnapshotRef = useRef<string | null>(null)
  const t1TextRef = useRef('')
  const t2TextRef = useRef('')
  const t1ResultRef = useRef<WritingSubResult | null>(null)

  function load() {
    setInnerPhase('loading')
    Promise.all([
      window.api.getExercises('writing/task1') as Promise<WritingTask1[]>,
      window.api.getExercises('writing/task2') as Promise<WritingTask2[]>,
    ])
      .then(([t1s, t2s]) => {
        if (t1s.length === 0 || t2s.length === 0) { setInnerPhase('error'); return }
        setT1Exercise(t1s[Math.floor(Math.random() * t1s.length)])
        setT2Exercise(t2s[Math.floor(Math.random() * t2s.length)])
        setInnerPhase('t1')
      })
      .catch(() => setInnerPhase('error'))
  }

  useEffect(() => { load() }, [])

  useEffect(() => { t1TextRef.current = t1Text }, [t1Text])
  useEffect(() => { t2TextRef.current = t2Text }, [t2Text])

  // T1 timer
  useEffect(() => {
    if (innerPhase !== 't1') return
    setElapsed(0)
    setSnapshotTaken(false)
    t1SnapshotRef.current = null
    const id = setInterval(() => {
      setElapsed(s => {
        const next = s + 1
        if (next === T1_TARGET && t1SnapshotRef.current === null) {
          t1SnapshotRef.current = t1TextRef.current
          setSnapshotTaken(true)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [innerPhase === 't1'])  // eslint-disable-line react-hooks/exhaustive-deps

  // T2 timer
  useEffect(() => {
    if (innerPhase !== 't2') return
    setElapsed(0)
    setSnapshotTaken(false)
    t2SnapshotRef.current = null
    const id = setInterval(() => {
      setElapsed(s => {
        const next = s + 1
        if (next === T2_TARGET && t2SnapshotRef.current === null) {
          t2SnapshotRef.current = t2TextRef.current
          setSnapshotTaken(true)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [innerPhase === 't2'])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleT1Next() {
    if (!t1Exercise) return
    t1ResultRef.current = {
      exercise: t1Exercise,
      text: t1Text,
      snapshotText: t1SnapshotRef.current,
      elapsedSeconds: elapsed,
    }
    setInnerPhase('t2')
  }

  function handleT2Finish() {
    if (!t2Exercise || !t1ResultRef.current) return
    onComplete({
      t1: t1ResultRef.current,
      t2: { exercise: t2Exercise, text: t2Text, snapshotText: t2SnapshotRef.current, elapsedSeconds: elapsed },
    })
  }

  if (innerPhase === 'loading') {
    return <p className="p-8 text-subtext0 text-sm text-center">Caricamento esercizi writing…</p>
  }

  if (innerPhase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-red text-sm">Errore nel caricamento degli esercizi Writing.</p>
        <button onClick={load}
          className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors">
          Riprova
        </button>
      </div>
    )
  }

  const targetLabel = innerPhase === 't1' ? '20:00' : '40:00'
  const taskLabel = innerPhase === 't1' ? 'Task 1 — Grafico' : 'Task 2 — Essay'
  const prompt = innerPhase === 't1'
    ? (t1Exercise as WritingTask1).prompt
    : (t2Exercise as WritingTask2).question

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Timer bar */}
      <div className="px-6 py-2 bg-surface0/50 border-b border-surface0 flex items-center justify-between shrink-0">
        <span className="text-xs font-medium text-mauve">{taskLabel}</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-mono font-semibold text-text">{fmtSec(elapsed)}</span>
          {snapshotTaken
            ? <span className="text-xs text-yellow bg-yellow/10 px-2 py-0.5 rounded-full">📸 snapshot a {targetLabel}</span>
            : <span className="text-xs text-subtext0">/ {targetLabel} target</span>}
        </div>
      </div>

      {/* Prompt */}
      <div className="px-6 py-3 bg-mantle/40 border-b border-surface0 shrink-0">
        <p className="text-sm text-text leading-relaxed line-clamp-3">{prompt}</p>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {innerPhase === 't1' ? (
          <WritingEditor taskType="task1" value={t1Text} onChange={setT1Text} />
        ) : (
          <WritingEditor taskType="task2" value={t2Text} onChange={setT2Text} />
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-surface0 flex justify-end shrink-0">
        {innerPhase === 't1' ? (
          <button onClick={handleT1Next}
            className="px-4 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors">
            Passa a Task 2 ▶
          </button>
        ) : (
          <button onClick={handleT2Finish}
            className="px-4 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors">
            Termina Writing ✓
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/components/exam/ExamWritingSection.tsx && git commit -m "feat: add ExamWritingSection with T1+T2 sequence and timers"
```

---

### Task 4: ExamSimulator page

**Files:**
- Modify: `src/renderer/src/pages/ExamSimulator.tsx` (replace placeholder)

- [ ] **Step 1: Replace the file content**

```tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ExamRun, AIWritingFeedback, WritingTask1, WritingTask2 } from '../types'
import { ExamListeningSection } from '../components/exam/ExamListeningSection'
import type { ListeningResult } from '../components/exam/ExamListeningSection'
import { ExamReadingSection } from '../components/exam/ExamReadingSection'
import type { ReadingResult } from '../components/exam/ExamReadingSection'
import { ExamWritingSection } from '../components/exam/ExamWritingSection'
import type { WritingResult } from '../components/exam/ExamWritingSection'
import { scoreAnswers } from '../components/practice/utils'
import { countWords } from '../components/practice/writingUtils'

type SectionType = 'listening' | 'reading' | 'writing'
type ExamPhase = 'loading' | 'setup' | 'running' | 'evaluating' | 'results' | 'error'

interface AIWritingPair {
  t1: AIWritingFeedback | null
  t2: AIWritingFeedback | null
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function ExamSimulator() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<ExamPhase>('loading')
  const [sections, setSections] = useState({ listening: true, reading: true, writing: true })
  const [examRuns, setExamRuns] = useState<ExamRun[]>([])
  const [sectionQueue, setSectionQueue] = useState<SectionType[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [aiWriting, setAiWriting] = useState<AIWritingPair | null>(null)
  const [saveError, setSaveError] = useState(false)

  // Refs to avoid stale closures
  const queueRef = useRef<SectionType[]>([])
  const indexRef = useRef(0)
  const examStartRef = useRef(0)
  const resultsRef = useRef<{
    listening: ListeningResult | null
    reading: ReadingResult | null
    writing: WritingResult | null
  }>({ listening: null, reading: null, writing: null })

  function load() {
    window.api.getExamRuns()
      .then((runs: ExamRun[]) => {
        setExamRuns(runs.slice(0, 3))
        setPhase('setup')
      })
      .catch(() => setPhase('setup'))  // non-blocking: show setup even on error
  }

  useEffect(() => { load() }, [])

  function handleStart() {
    const q = (['listening', 'reading', 'writing'] as SectionType[]).filter(s => sections[s])
    if (q.length === 0) return
    queueRef.current = q
    indexRef.current = 0
    examStartRef.current = Date.now()
    resultsRef.current = { listening: null, reading: null, writing: null }
    setSectionQueue(q)
    setCurrentIndex(0)
    setAiWriting(null)
    setSaveError(false)
    setPhase('running')
  }

  function advance() {
    const next = indexRef.current + 1
    if (next < queueRef.current.length) {
      indexRef.current = next
      setCurrentIndex(next)
    } else {
      finishExam()
    }
  }

  function handleListeningComplete(result: ListeningResult) {
    resultsRef.current.listening = result
    advance()
  }

  function handleReadingComplete(result: ReadingResult) {
    resultsRef.current.reading = result
    advance()
  }

  function handleWritingComplete(result: WritingResult) {
    resultsRef.current.writing = result
    advance()
  }

  function finishExam() {
    const wr = resultsRef.current.writing
    if (wr) {
      setPhase('evaluating')
      void runEvaluation(wr)
    } else {
      void saveAndShowResults(null)
    }
  }

  async function runEvaluation(wr: WritingResult) {
    const [r1, r2] = await Promise.allSettled([
      window.api.evaluateWriting('task1', wr.t1.text, (wr.t1.exercise as WritingTask1).prompt, countWords(wr.t1.text)),
      window.api.evaluateWriting('task2', wr.t2.text, (wr.t2.exercise as WritingTask2).question, countWords(wr.t2.text)),
    ])
    const pair: AIWritingPair = {
      t1: r1.status === 'fulfilled' ? r1.value : null,
      t2: r2.status === 'fulfilled' ? r2.value : null,
    }
    setAiWriting(pair)
    await saveAndShowResults(pair)
  }

  async function saveAndShowResults(pair: AIWritingPair | null) {
    const { listening, reading, writing } = resultsRef.current
    const now = Date.now()

    // Save practice sessions (fire-and-forget)
    if (listening?.exercise) {
      const { correctCount, maxScore } = scoreAnswers(listening.exercise.questions, listening.answers)
      window.api.saveSession({
        exercise_id: listening.exercise.id,
        section: 'listening',
        started_at: examStartRef.current,
        completed_at: now,
        score: correctCount,
        max_score: maxScore,
        time_spent_seconds: listening.elapsedSeconds,
      }).catch(() => {})
    }
    if (reading?.exercise) {
      const { correctCount, maxScore } = scoreAnswers(reading.exercise.questions, reading.answers)
      window.api.saveSession({
        exercise_id: reading.exercise.id,
        section: 'reading',
        started_at: examStartRef.current,
        completed_at: now,
        score: correctCount,
        max_score: maxScore,
        time_spent_seconds: reading.elapsedSeconds,
      }).catch(() => {})
    }
    if (writing) {
      window.api.saveWritingSubmission({
        task_id: writing.t1.exercise.id,
        task_type: 'task1',
        submitted_at: examStartRef.current,
        text: writing.t1.text,
        word_count: countWords(writing.t1.text),
      }).catch(() => {})
      window.api.saveWritingSubmission({
        task_id: writing.t2.exercise.id,
        task_type: 'task2',
        submitted_at: examStartRef.current,
        text: writing.t2.text,
        word_count: countWords(writing.t2.text),
      }).catch(() => {})
    }

    // Compute scores
    let listenScore: number | undefined
    let readScore: number | undefined
    let writeScore: number | undefined
    if (listening?.exercise) {
      const { correctCount, maxScore } = scoreAnswers(listening.exercise.questions, listening.answers)
      listenScore = maxScore > 0 ? correctCount / maxScore : undefined
    }
    if (reading?.exercise) {
      const { correctCount, maxScore } = scoreAnswers(reading.exercise.questions, reading.answers)
      readScore = maxScore > 0 ? correctCount / maxScore : undefined
    }
    if (pair) {
      const bands = [pair.t1?.band, pair.t2?.band].filter((b): b is number => b != null)
      writeScore = bands.length > 0 ? bands.reduce((a, b) => a + b, 0) / bands.length : undefined
    }

    try {
      await window.api.saveExamRun({
        started_at: examStartRef.current,
        completed_at: now,
        listening_score: listenScore,
        reading_score: readScore,
        writing_score: writeScore,
      })
    } catch {
      setSaveError(true)
    }
    setPhase('results')
  }

  // ── LOADING ───────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return <p className="p-8 text-subtext0 text-sm text-center">Caricamento…</p>
  }

  // ── EVALUATING ────────────────────────────────────────────────────────────────
  if (phase === 'evaluating') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-mauve border-t-transparent rounded-full animate-spin" />
        <p className="text-subtext0 text-sm">Valutazione AI in corso…</p>
      </div>
    )
  }

  // ── RUNNING ───────────────────────────────────────────────────────────────────
  if (phase === 'running') {
    const section = sectionQueue[currentIndex]
    const total = sectionQueue.length
    const sectionLabel: Record<SectionType, string> = {
      listening: '🎧 Listening',
      reading: '📖 Reading',
      writing: '✍️ Writing',
    }
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Exam header */}
        <div className="px-6 py-2 bg-mantle border-b border-surface0 shrink-0 flex items-center gap-3">
          <span className="text-xs font-semibold text-mauve uppercase tracking-wide">Simulazione Esame</span>
          <span className="text-xs text-subtext0">·</span>
          <span className="text-xs text-subtext0">
            Sezione {currentIndex + 1} di {total} · {sectionLabel[section]}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          {section === 'listening' && (
            <ExamListeningSection onComplete={handleListeningComplete} />
          )}
          {section === 'reading' && (
            <ExamReadingSection onComplete={handleReadingComplete} />
          )}
          {section === 'writing' && (
            <ExamWritingSection onComplete={handleWritingComplete} />
          )}
        </div>
      </div>
    )
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const { listening, reading, writing } = resultsRef.current

    function scoreRow(result: ListeningResult | ReadingResult) {
      if (!result.exercise) return { snap: '—', total: '—' }
      const snap = result.snapshotAnswers
        ? (() => { const { correctCount, maxScore } = scoreAnswers(result.exercise!.questions, result.snapshotAnswers!); return `${correctCount}/${maxScore}` })()
        : '—'
      const { correctCount, maxScore } = scoreAnswers(result.exercise.questions, result.answers)
      return { snap, total: `${correctCount}/${maxScore}` }
    }

    const listenRow = listening ? scoreRow(listening) : null
    const readRow = reading ? scoreRow(reading) : null

    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-text">Risultati Esame</h1>
            <span className="text-xs text-subtext0">{fmtDate(examStartRef.current)}</span>
          </div>

          {saveError && (
            <div className="bg-yellow/10 border border-yellow/30 rounded-lg px-4 py-3 text-sm text-yellow">
              Errore nel salvataggio dei risultati.{' '}
              <button
                onClick={() => { setSaveError(false); void saveAndShowResults(aiWriting) }}
                className="underline hover:no-underline"
              >
                Riprova salvataggio
              </button>
            </div>
          )}

          {/* Results table */}
          <div className="bg-surface0/30 border border-surface0 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface0 text-xs text-subtext0 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Sezione</th>
                  <th className="text-right px-4 py-3">Entro il tempo</th>
                  <th className="text-right px-4 py-3">Totale</th>
                  <th className="text-right px-4 py-3">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {listenRow && listening && (
                  <tr className="border-b border-surface0/50">
                    <td className="px-4 py-3 text-text">🎧 Listening</td>
                    <td className="px-4 py-3 text-right text-subtext0">{listenRow.snap}</td>
                    <td className="px-4 py-3 text-right font-medium text-green">{listenRow.total}</td>
                    <td className="px-4 py-3 text-right text-subtext0">{fmtSec(listening.elapsedSeconds)}</td>
                  </tr>
                )}
                {readRow && reading && (
                  <tr className="border-b border-surface0/50">
                    <td className="px-4 py-3 text-text">📖 Reading</td>
                    <td className="px-4 py-3 text-right text-subtext0">{readRow.snap}</td>
                    <td className="px-4 py-3 text-right font-medium text-green">{readRow.total}</td>
                    <td className="px-4 py-3 text-right text-subtext0">{fmtSec(reading.elapsedSeconds)}</td>
                  </tr>
                )}
                {writing && (
                  <>
                    <tr className="border-b border-surface0/50">
                      <td className="px-4 py-3 text-text">✍️ Writing T1</td>
                      <td className="px-4 py-3 text-right text-subtext0">
                        {writing.t1.snapshotText ? `${countWords(writing.t1.snapshotText)} parole` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue">
                        {aiWriting?.t1 ? `Band ${aiWriting.t1.band}` : 'N/D'}
                      </td>
                      <td className="px-4 py-3 text-right text-subtext0">{fmtSec(writing.t1.elapsedSeconds)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-text">✍️ Writing T2</td>
                      <td className="px-4 py-3 text-right text-subtext0">
                        {writing.t2.snapshotText ? `${countWords(writing.t2.snapshotText)} parole` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue">
                        {aiWriting?.t2 ? `Band ${aiWriting.t2.band}` : 'N/D'}
                      </td>
                      <td className="px-4 py-3 text-right text-subtext0">{fmtSec(writing.t2.elapsedSeconds)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Writing AI feedback */}
          {aiWriting && writing && (
            <div className="flex flex-col gap-3">
              {[
                { label: 'Writing T1', fb: aiWriting.t1 },
                { label: 'Writing T2', fb: aiWriting.t2 },
              ].map(({ label, fb }) => fb && (
                <details key={label} className="bg-surface0/20 border border-surface0 rounded-xl">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-text select-none">
                    Feedback AI — {label} · Band {fb.band}
                  </summary>
                  <div className="px-4 pb-4 flex flex-col gap-3 text-sm">
                    <p className="text-subtext0">{fb.overall}</p>
                    {fb.strengths.length > 0 && (
                      <div>
                        <p className="text-green text-xs font-semibold uppercase tracking-wide mb-1">Punti di forza</p>
                        <ul className="flex flex-col gap-1">
                          {fb.strengths.map((s, i) => <li key={i} className="text-text">• {s}</li>)}
                        </ul>
                      </div>
                    )}
                    {fb.improvements.length > 0 && (
                      <div>
                        <p className="text-yellow text-xs font-semibold uppercase tracking-wide mb-1">Miglioramenti</p>
                        <ul className="flex flex-col gap-1">
                          {fb.improvements.map((s, i) => <li key={i} className="text-text">• {s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => { load(); setPhase('loading') }}
              className="px-5 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors"
            >
              Nuovo esame ▶
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────────
  const anySelected = sections.listening || sections.reading || sections.writing
  const SECTION_META: Record<SectionType, string> = {
    listening: '~40 min · esercizio random',
    reading: '~60 min · esercizio random',
    writing: 'Task 1 + Task 2 · valutazione AI',
  }
  const SECTION_LABELS: Record<SectionType, string> = {
    listening: '🎧 Listening',
    reading: '📖 Reading',
    writing: '✍️ Writing',
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-text">Simulazione Esame</h1>
          <p className="text-sm text-subtext0 mt-1">
            Seleziona le sezioni da includere. Un esercizio verrà scelto automaticamente per ciascuna.
          </p>
        </div>

        {/* Section checkboxes */}
        <div className="flex flex-col gap-3">
          {(['listening', 'reading', 'writing'] as SectionType[]).map(s => (
            <label key={s}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                sections[s]
                  ? 'border-mauve/40 bg-mauve/10'
                  : 'border-surface0 bg-surface0/20 hover:bg-surface0/40'
              }`}>
              <input
                type="checkbox"
                checked={sections[s]}
                onChange={e => setSections(prev => ({ ...prev, [s]: e.target.checked }))}
                className="w-4 h-4 accent-mauve"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{SECTION_LABELS[s]}</p>
                <p className="text-xs text-subtext0">{SECTION_META[s]}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleStart}
            disabled={!anySelected}
            className="px-5 py-2 bg-mauve text-base rounded text-sm font-medium
              hover:bg-mauve/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Inizia esame ▶
          </button>
        </div>

        {/* Exam history */}
        {examRuns.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-subtext0 uppercase tracking-wide mb-3">
              Ultime simulazioni
            </h2>
            <div className="flex flex-col gap-2">
              {examRuns.map(r => (
                <div key={r.id}
                  className="flex items-center justify-between px-4 py-3
                    bg-surface0/30 border border-surface0 rounded-lg">
                  <span className="text-sm text-text">{fmtDate(r.started_at)}</span>
                  <div className="flex items-center gap-4 text-sm">
                    {r.listening_score != null && (
                      <span className="text-green">🎧 {Math.round(r.listening_score * 100)}%</span>
                    )}
                    {r.reading_score != null && (
                      <span className="text-blue">📖 {Math.round(r.reading_score * 100)}%</span>
                    )}
                    {r.writing_score != null && (
                      <span className="text-yellow">✍️ {r.writing_score.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx tsc --noEmit 2>&1 | head -40
```

Fix any TypeScript errors before proceeding. Common issue: `AIWritingFeedback` must have a `band` field — check `src/renderer/src/types/index.ts`. If the type uses `band_score` instead of `band`, update the field references in the results table accordingly.

- [ ] **Step 3: Run tests**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx vitest run 2>&1 | tail -8
```

Expected: all 56 tests still passing.

- [ ] **Step 4: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/pages/ExamSimulator.tsx && git commit -m "feat: implement ExamSimulator — setup, sections, AI eval, results"
```

---

### Task 5: Dashboard — Ultime simulazioni

**Files:**
- Modify: `src/renderer/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add `examRuns` state and load call**

In `Dashboard.tsx`, find the existing state declarations (around line 21–26) and add:

```tsx
const [examRuns, setExamRuns] = useState<ExamRun[]>([])
```

Find the existing `Promise.all` in `load()` (around line 33) and change it to include `getExamRuns`:

```tsx
Promise.all([
  window.api.getAnalytics(30),
  window.api.getRecentSessions(5),
  window.api.getExamRuns(),
])
  .then(([a, s, runs]) => {
    setAnalytics(a)
    setSessions(s)
    setExamRuns((runs as ExamRun[]).slice(0, 3))
  })
  .catch(() => setError('Errore nel caricamento dei dati.'))
  .finally(() => setLoading(false))
```

- [ ] **Step 2: Add import for ExamRun**

At the top of `Dashboard.tsx`, the existing import is:

```tsx
import type { AnalyticsData, Session } from '../types'
```

Change it to:

```tsx
import type { AnalyticsData, Session, ExamRun } from '../types'
```

- [ ] **Step 3: Add "Ultime simulazioni" section**

After the closing `</div>` of the "Sessioni recenti" section (around line 127), add:

```tsx
{/* Ultime simulazioni */}
<div>
  <h2 className="text-xs font-semibold text-subtext0 uppercase tracking-wide mb-3">
    Ultime simulazioni
  </h2>
  {examRuns.length === 0 ? (
    <p className="text-subtext0 text-sm">Nessuna simulazione ancora.</p>
  ) : (
    <div className="flex flex-col gap-2">
      {examRuns.map(r => (
        <div
          key={r.id}
          onClick={() => navigate('/exam')}
          className="flex items-center justify-between px-4 py-3
            bg-surface0/30 border border-surface0 rounded-lg cursor-pointer
            hover:border-mauve/40 hover:bg-surface0/60 transition-colors"
        >
          <span className="text-sm text-text">
            {new Date(r.started_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <div className="flex items-center gap-4 text-sm">
            {r.listening_score != null && (
              <span className="text-green">🎧 {Math.round(r.listening_score * 100)}%</span>
            )}
            {r.reading_score != null && (
              <span className="text-blue">📖 {Math.round(r.reading_score * 100)}%</span>
            )}
            {r.writing_score != null && (
              <span className="text-yellow">✍️ {r.writing_score.toFixed(1)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx vitest run 2>&1 | tail -8
```

Expected: all 56 tests passing.

- [ ] **Step 6: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/pages/Dashboard.tsx && git commit -m "feat: add exam run history to Dashboard"
```
