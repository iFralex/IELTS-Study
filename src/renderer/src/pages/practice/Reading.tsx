import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReadingExercise } from '../../types'
import { ExerciseList } from '../../components/practice/ExerciseList'
import { ReadingPassage } from '../../components/practice/ReadingPassage'
import { QuestionInput } from '../../components/practice/QuestionInput'
import { ResultsPanel } from '../../components/practice/ResultsPanel'
import { scoreAnswers, answersMatch } from '../../components/practice/utils'

type Phase = 'selecting' | 'active' | 'results'

interface Queue {
  exercises: ReadingExercise[]
  currentIndex: number
  startedAt: number
  answers: Record<number, string>
}

export function Reading() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('selecting')
  const [exercises, setExercises] = useState<ReadingExercise[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [queue, setQueue] = useState<Queue | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [highlightText, setHighlightText] = useState<string | undefined>(undefined)

  function load() {
    setLoadError(null)
    Promise.all([
      window.api.getExercises('reading') as Promise<ReadingExercise[]>,
      window.api.getCompletedExerciseIds('reading'),
    ])
      .then(([exs, ids]) => {
        setExercises(exs)
        setCompletedIds(new Set(ids))
      })
      .catch(() => setLoadError(t('practice.loadError')))
  }

  useEffect(() => { load() }, [])

  const currentExercise = queue?.exercises[queue.currentIndex] ?? null

  function handleStartSingle(exercise: ReadingExercise) {
    setQueue({ exercises: [exercise], currentIndex: 0, startedAt: Date.now(), answers: {} })
    setHighlightText(undefined)
    setSaveError(false)
    setPhase('active')
  }

  function handleStartSeries(exs: ReadingExercise[]) {
    setQueue({ exercises: exs, currentIndex: 0, startedAt: Date.now(), answers: {} })
    setHighlightText(undefined)
    setSaveError(false)
    setPhase('active')
  }

  function handleAnswerChange(questionIndex: number, value: string) {
    setQueue(q => q ? { ...q, answers: { ...q.answers, [questionIndex]: value } } : q)
  }

  async function handleSubmit() {
    if (!queue || !currentExercise) return
    const { correctCount, maxScore } = scoreAnswers(currentExercise.questions, queue.answers)
    const now = Date.now()
    try {
      const sessionId = await window.api.saveSession({
        exercise_id: currentExercise.id,
        section: 'reading',
        question_type: currentExercise.question_type,
        started_at: queue.startedAt,
        completed_at: now,
        score: correctCount,
        max_score: maxScore,
        time_spent_seconds: Math.round((now - queue.startedAt) / 1000),
      })
      await window.api.saveAnswers(
        currentExercise.questions.map(q => ({
          session_id: sessionId,
          question_index: q.index,
          user_answer: queue.answers[q.index] ?? '',
          correct_answer: q.answer,
          is_correct: answersMatch(queue.answers[q.index] ?? '', q.answer),
        }))
      )
      setCompletedIds(prev => new Set([...prev, currentExercise.id]))
    } catch {
      setSaveError(true)
    }
    setHighlightText(undefined)
    setPhase('results')
  }

  function handleNext() {
    if (!queue) return
    setQueue({ ...queue, currentIndex: queue.currentIndex + 1, startedAt: Date.now(), answers: {} })
    setHighlightText(undefined)
    setSaveError(false)
    setPhase('active')
  }

  function handleBack() {
    setQueue(null)
    setHighlightText(undefined)
    setPhase('selecting')
  }

  if (phase === 'selecting') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-surface0 shrink-0">
          <h1 className="text-xl font-bold text-text">{t('practice.readingTitle')}</h1>
          <p className="text-sm text-subtext0 mt-0.5">{exercises.length} {t('practice.availableExercises')}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ExerciseList
            section="reading"
            exercises={exercises}
            completedIds={completedIds}
            onStartSingle={ex => handleStartSingle(ex as ReadingExercise)}
            onStartSeries={exs => handleStartSeries(exs as ReadingExercise[])}
            error={loadError}
            onRetry={load}
          />
        </div>
      </div>
    )
  }

  if (!currentExercise || !queue) return null

  if (phase === 'active') {
    const paragraphLabels = currentExercise.passage
      .split('\n\n')
      .map((_, i) => String.fromCharCode(65 + i))

    return (
      <div className="h-full flex overflow-hidden">
        <div className="w-[55%] h-full border-r border-surface0 overflow-hidden flex flex-col">
          <ReadingPassage exercise={currentExercise} highlightText={highlightText} />
        </div>
        <div className="w-[45%] h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-5">
              {currentExercise.questions.map(q => (
                <div key={q.index} className="flex flex-col gap-2">
                  <label className="text-sm text-text font-medium leading-snug">
                    {q.index + 1}.{' '}
                    {currentExercise.question_type === 'matching_headings' && q.paragraph
                      ? `${t('common.paragraph')} ${q.paragraph}: `
                      : ''}
                    {q.text}
                  </label>
                  <QuestionInput
                    question={q}
                    questionType={currentExercise.question_type}
                    value={queue.answers[q.index] ?? ''}
                    onChange={val => handleAnswerChange(q.index, val)}
                    paragraphLabels={paragraphLabels}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-surface0 shrink-0 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-sm text-subtext0 hover:text-text transition-colors"
            >
              ← {t('practice.abandon')}
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 bg-mauve text-base rounded font-medium text-sm hover:bg-mauve/90 transition-colors"
            >
              {t('practice.check')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isLastInSeries = queue.currentIndex === queue.exercises.length - 1
  const seriesProgress = queue.exercises.length > 1
    ? { current: queue.currentIndex + 1, total: queue.exercises.length }
    : undefined

  return (
    <div className="h-full flex overflow-hidden">
      <div className="w-[55%] h-full border-r border-surface0 overflow-hidden flex flex-col">
        <ReadingPassage exercise={currentExercise} highlightText={highlightText} />
      </div>
      <div className="w-[45%] h-full overflow-y-auto">
        {saveError && (
          <div className="mx-4 mt-4 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-sm">
            ⚠ {t('practice.saveError')}
          </div>
        )}
        <ResultsPanel
          exercise={currentExercise}
          answers={queue.answers}
          section="reading"
          onNext={!isLastInSeries ? handleNext : undefined}
          onBack={handleBack}
          seriesProgress={seriesProgress}
        />
      </div>
    </div>
  )
}
