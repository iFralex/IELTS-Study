import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReadingExercise } from '../../types'
import { QuestionInput } from '../practice/QuestionInput'

function stripInlineOptions(text: string): string {
  return text.replace(/\s*\([^)]*[A-G]=[^)]+\)/, '').replace(/\s*[A-G]=.+$/, '').trim()
}

export interface ReadingResult {
  exercises: ReadingExercise[]
  answers: Record<string, string>
  snapshotAnswers: Record<string, string> | null
  elapsedSeconds: number
}

const TARGET_SECONDS = 3600
const TARGET_QUESTIONS = 40

interface Props {
  onComplete: (result: ReadingResult) => void
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function pickExercises(all: ReadingExercise[]): ReadingExercise[] {
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  const picked: ReadingExercise[] = []
  let total = 0
  for (const ex of shuffled) {
    picked.push(ex)
    total += ex.questions.length
    if (total >= TARGET_QUESTIONS) break
  }
  return picked
}

export function ExamReadingSection({ onComplete }: Props) {
  const { t } = useTranslation()
  const [exercises, setExercises] = useState<ReadingExercise[]>([])
  const [loadError, setLoadError] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const [snapshotTaken, setSnapshotTaken] = useState(false)
  const [snapshotFlash, setSnapshotFlash] = useState(false)
  const snapshotRef = useRef<Record<string, string> | null>(null)
  const answersRef = useRef<Record<string, string>>({})

  function load() {
    setLoadError(false)
    ;(window.api.getExercises('reading') as Promise<ReadingExercise[]>)
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
        <p className="text-red text-sm">{t('examReading.loadError')}</p>
        <button onClick={load} className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors">{t('common.retry')}</button>
        <button onClick={handleSkip} className="text-subtext0 text-sm underline">{t('examReading.skipLink')}</button>
      </div>
    )
  }

  if (!exercises.length) {
    return <p className="p-8 text-subtext0 text-sm text-center">{t('examReading.loading')}</p>
  }

  const totalQuestions = exercises.reduce((s, ex) => s + ex.questions.length, 0)

  // Compute global question start index per exercise
  let q = 0
  const exercisesWithStart = exercises.map(ex => {
    const start = q
    q += ex.questions.length
    return { ex, start }
  })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Timer bar */}
      <div className={`px-6 py-2 border-b border-surface0 flex items-center justify-between shrink-0 transition-colors duration-500 ${snapshotFlash ? 'bg-yellow/20' : 'bg-surface0/50'}`}>
        <span className="text-xs text-subtext0">
          {exercises.length} {t(exercises.length === 1 ? 'examReading.passage_one' : 'examReading.passage_other')} · {totalQuestions} {t(totalQuestions === 1 ? 'examReading.question_one' : 'examReading.question_other')}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-mono font-semibold text-text">{fmtSec(elapsed)}</span>
          {snapshotTaken
            ? <span className={`text-xs text-yellow px-2 py-0.5 rounded-full transition-colors ${snapshotFlash ? 'bg-yellow/30' : 'bg-yellow/10'}`}>{t('examReading.snapshot')}</span>
            : <span className="text-xs text-subtext0">{t('examReading.targetTime')}</span>}
        </div>
      </div>

      {/* Split: passages left, questions right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Passages */}
        <div className="w-[55%] h-full border-r border-surface0 overflow-y-auto">
          {exercisesWithStart.map(({ ex }, ei) => (
            <div key={ex.id} className={ei > 0 ? 'border-t-2 border-surface1' : ''}>
              <div className="px-4 py-2 bg-surface0/50 border-b border-surface0 sticky top-0 z-10">
                <span className="text-xs font-semibold text-mauve">{t('examReading.passageLabel')} {ei + 1}</span>
                <span className="text-xs text-subtext0 ml-2">{ex.title}</span>
              </div>
              <div className="p-4 text-sm leading-7 text-text whitespace-pre-wrap">
                {ex.passage}
              </div>
            </div>
          ))}
        </div>

        {/* Questions */}
        <div className="w-[45%] h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-6">
              {exercisesWithStart.map(({ ex, start }, ei) => {
                const paragraphLabels = ex.passage.split('\n\n').map((_, i) => String.fromCharCode(65 + i))
                return (
                  <div key={ex.id}>
                    <p className="text-xs font-semibold text-mauve uppercase tracking-wide mb-3">
                      {t('examReading.passageLabel')} {ei + 1} — {ex.question_type.replace(/_/g, ' ')}
                    </p>
                    <div className="flex flex-col gap-4">
                      {ex.questions.map((q, li) => {
                        const key = `${ex.id}:${q.index}`
                        return (
                          <div key={q.index} className="flex flex-col gap-2">
                            <label className="text-sm text-text font-medium leading-snug">
                              {start + li + 1}.{' '}
                              {ex.question_type === 'matching_headings' && q.paragraph
                                ? `${t('common.paragraph')} ${q.paragraph}: `
                                : ''}
                              {stripInlineOptions(q.text)}
                            </label>
                            <QuestionInput
                              question={q}
                              questionType={ex.question_type}
                              value={answers[key] ?? ''}
                              onChange={v => setAnswers(a => ({ ...a, [key]: v }))}
                              paragraphLabels={paragraphLabels}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-surface0 flex justify-between shrink-0">
            <button onClick={handleSkip} className="px-4 py-2 bg-surface0 text-subtext0 rounded text-sm hover:text-text transition-colors">
              {t('examReading.skipSection')}
            </button>
            <button onClick={handleComplete} className="px-4 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors">
              {t('examReading.nextSection')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
