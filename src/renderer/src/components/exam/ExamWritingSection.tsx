import { useState, useEffect, useRef } from 'react'
import type { WritingTask1, WritingTask2 } from '../../types'
import { WritingEditor } from '../practice/WritingEditor'

export interface WritingSubResult {
  exercise: WritingTask1 | WritingTask2
  text: string
  snapshotText: string | null
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
  }, [innerPhase])

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
  }, [innerPhase])

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
          className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface0/90 transition-colors">
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
      <div className="px-6 py-3 bg-mantle/40 border-b border-surface0 max-h-40 overflow-y-auto shrink-0">
        <p className="text-sm text-text leading-relaxed">{prompt}</p>
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
