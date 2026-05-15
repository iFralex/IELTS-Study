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
