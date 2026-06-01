import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ListeningExercise } from '../../types'
import { AudioPlayer } from '../practice/AudioPlayer'
import { QuestionInput } from '../practice/QuestionInput'
import { ExerciseImage } from '../ExerciseImage'

export interface ListeningResult {
  exercises: ListeningExercise[]
  answers: Record<string, string>
  snapshotAnswers: Record<string, string> | null
  elapsedSeconds: number
}

const TARGET_SECONDS = 2400
const TARGET_QUESTIONS = 40

interface Props {
  onComplete: (result: ListeningResult) => void
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function pickExercises(all: ListeningExercise[]): ListeningExercise[] {
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  const picked: ListeningExercise[] = []
  let total = 0
  for (const ex of shuffled) {
    picked.push(ex)
    total += ex.questions.length
    if (total >= TARGET_QUESTIONS) break
  }
  return picked
}

function stripInlineOptions(text: string): string {
  return text.replace(/\s*\([^)]*[A-G]=[^)]+\)/, '').replace(/\s*[A-G]=.+$/, '').trim()
}

export function ExamListeningSection({ onComplete }: Props) {
  const { t } = useTranslation()
  const [exercises, setExercises] = useState<ListeningExercise[]>([])
  const [loadError, setLoadError] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const [snapshotTaken, setSnapshotTaken] = useState(false)
  const [snapshotFlash, setSnapshotFlash] = useState(false)
  const snapshotRef = useRef<Record<string, string> | null>(null)
  const answersRef = useRef<Record<string, string>>({})

  function load() {
    setLoadError(false)
    ;(window.api.getExercises('listening') as Promise<ListeningExercise[]>)
      .then(exs => {
        if (exs.length === 0) { setLoadError(true); return }
        setExercises(pickExercises(exs))
      })
      .catch(() => setLoadError(true))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { answersRef.current = answers }, [answers])

  useEffect(() => {
    if (!exercises.length) return
    const id = setInterval(() => {
      setElapsed(s => {
        const next = s + 1
        if (next === TARGET_SECONDS && snapshotRef.current === null) {
          snapshotRef.current = { ...answersRef.current }
          setSnapshotTaken(true)
          setSnapshotFlash(true)
          setTimeout(() => setSnapshotFlash(false), 3000)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [exercises])

  function handleComplete() {
    onComplete({ exercises, answers, snapshotAnswers: snapshotRef.current, elapsedSeconds: elapsed })
  }

  function handleSkip() {
    onComplete({ exercises: [], answers: {}, snapshotAnswers: null, elapsedSeconds: elapsed })
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-red text-sm">{t('examListening.loadError')}</p>
        <button onClick={load} className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors">{t('common.retry')}</button>
        <button onClick={handleSkip} className="text-subtext0 text-sm underline">{t('examListening.skipLink')}</button>
      </div>
    )
  }

  if (!exercises.length) {
    return <p className="p-8 text-subtext0 text-sm text-center">{t('examListening.loading')}</p>
  }

  const totalQuestions = exercises.reduce((s, ex) => s + ex.questions.length, 0)

  let q = 0
  const exercisesWithStart = exercises.map(ex => {
    const start = q
    q += ex.questions.length
    return { ex, start }
  })

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Timer bar */}
        <div className={`px-6 py-2 border-b border-surface0 flex items-center justify-between shrink-0 transition-colors duration-500 ${snapshotFlash ? 'bg-yellow/20' : 'bg-surface0/50'}`}>
          <span className="text-xs text-subtext0">
            {exercises.length} {t(exercises.length === 1 ? 'examListening.exercise_one' : 'examListening.exercise_other')} · {totalQuestions} {t(totalQuestions === 1 ? 'examListening.question_one' : 'examListening.question_other')}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-mono font-semibold text-text">{fmtSec(elapsed)}</span>
            {snapshotTaken
              ? <span className={`text-xs text-yellow px-2 py-0.5 rounded-full transition-colors ${snapshotFlash ? 'bg-yellow/30' : 'bg-yellow/10'}`}>{t('examListening.snapshot')}</span>
              : <span className="text-xs text-subtext0">{t('examListening.targetTime')}</span>}
          </div>
        </div>

        {/* Scrollable list of exercises */}
        <div className="flex-1 overflow-y-auto">
          {exercisesWithStart.map(({ ex, start }, ei) => (
            <div key={ex.id} className={`${ei > 0 ? 'border-t-2 border-surface1' : ''}`}>
              {/* Section header */}
              <div className="px-6 py-2 bg-surface0/40 border-b border-surface0 flex items-center gap-2">
                <span className="text-xs font-semibold text-mauve">{t('common.section')} {ei + 1}</span>
                <span className="text-xs text-subtext0">{ex.title}</span>
                <span className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded ml-auto">
                  {ex.question_type.replace(/_/g, ' ')}
                </span>
              </div>

              {ex.image_url ? (
                /* Two-column: image left, audio+questions right */
                <div className="flex h-[500px]">
                  <div className="w-1/2 border-r border-surface0 overflow-y-auto p-4">
                    <ExerciseImage src={ex.image_url} alt={ex.title} />
                  </div>
                  <div className="w-1/2 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                      <div className="px-4 pt-4 pb-2">
                        <AudioPlayer audioUrl={ex.audio_url} sourceUrl={ex.source_url} />
                      </div>
                      <div className="flex flex-col gap-3 px-4 pb-4">
                        {ex.questions.map((q, li) => {
                          const key = `${ex.id}:${q.index}`
                          return (
                            <div key={q.index} className="bg-surface0/30 border border-surface0 rounded-lg p-3">
                              <p className="text-sm text-text mb-2">{start + li + 1}. {stripInlineOptions(q.text)}</p>
                              <QuestionInput
                                question={q}
                                questionType={ex.question_type}
                                value={answers[key] ?? ''}
                                onChange={v => setAnswers(a => ({ ...a, [key]: v }))}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Single column: audio then questions */
                <div className="p-4 max-w-2xl mx-auto">
                  <div className="mb-3">
                    <AudioPlayer audioUrl={ex.audio_url} sourceUrl={ex.source_url} />
                  </div>
                  <div className="flex flex-col gap-3">
                    {ex.questions.map((q, li) => {
                      const key = `${ex.id}:${q.index}`
                      return (
                        <div key={q.index} className="bg-surface0/30 border border-surface0 rounded-lg p-3">
                          <p className="text-sm text-text mb-2">{start + li + 1}. {stripInlineOptions(q.text)}</p>
                          <QuestionInput
                            question={q}
                            questionType={ex.question_type}
                            value={answers[key] ?? ''}
                            onChange={v => setAnswers(a => ({ ...a, [key]: v }))}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-surface0 flex justify-between shrink-0">
          <button onClick={handleSkip} className="px-4 py-2 bg-surface0 text-subtext0 rounded text-sm hover:text-text transition-colors">
            {t('examListening.skipSection')}
          </button>
          <button onClick={handleComplete} className="px-4 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors">
            {t('examListening.nextSection')}
          </button>
        </div>
      </div>

    </>
  )
}
