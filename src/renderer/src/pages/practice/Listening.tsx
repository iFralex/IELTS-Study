import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ListeningExercise } from '../../types'
import { ExerciseList } from '../../components/practice/ExerciseList'
import { AudioPlayer } from '../../components/practice/AudioPlayer'
import { QuestionInput } from '../../components/practice/QuestionInput'
import { ResultsPanel } from '../../components/practice/ResultsPanel'
import { scoreAnswers, answersMatch } from '../../components/practice/utils'
import { Lightbox } from '../../components/Lightbox'

type Phase = 'selecting' | 'active' | 'results'

interface Queue {
  exercises: ListeningExercise[]
  currentIndex: number
  startedAt: number
  answers: Record<number, string>
}

export function Listening() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('selecting')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [exercises, setExercises] = useState<ListeningExercise[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [queue, setQueue] = useState<Queue | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)

  function load() {
    setLoadError(null)
    Promise.all([
      window.api.getExercises('listening') as Promise<ListeningExercise[]>,
      window.api.getCompletedExerciseIds('listening'),
    ])
      .then(([exs, ids]) => {
        setExercises(exs)
        setCompletedIds(new Set(ids))
      })
      .catch(() => setLoadError(t('practice.loadError')))
  }

  useEffect(() => { load() }, [])

  const currentExercise = queue?.exercises[queue.currentIndex] ?? null

  function handleStartSingle(exercise: ListeningExercise) {
    setQueue({ exercises: [exercise], currentIndex: 0, startedAt: Date.now(), answers: {} })
    setSaveError(false)
    setPhase('active')
  }

  function handleStartSeries(exs: ListeningExercise[]) {
    setQueue({ exercises: exs, currentIndex: 0, startedAt: Date.now(), answers: {} })
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
        section: 'listening',
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
    setPhase('results')
  }

  function handleNext() {
    if (!queue) return
    setQueue({ ...queue, currentIndex: queue.currentIndex + 1, startedAt: Date.now(), answers: {} })
    setSaveError(false)
    setPhase('active')
  }

  function handleBack() {
    setQueue(null)
    setPhase('selecting')
  }

  if (phase === 'selecting') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-surface0 shrink-0">
          <h1 className="text-xl font-bold text-text">{t('practice.listeningTitle')}</h1>
          <p className="text-sm text-subtext0 mt-0.5">{exercises.length} {t('practice.availableExercises')}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ExerciseList
            section="listening"
            exercises={exercises}
            completedIds={completedIds}
            onStartSingle={ex => handleStartSingle(ex as ListeningExercise)}
            onStartSeries={exs => handleStartSeries(exs as ListeningExercise[])}
            error={loadError}
            onRetry={load}
          />
        </div>
      </div>
    )
  }

  if (!currentExercise || !queue) return null

  if (phase === 'active') {
    const questions = (
      <div className="flex flex-col gap-5 px-5 py-4">
        {currentExercise.questions.map(q => (
          <div key={q.index} className="flex flex-col gap-2">
            <label className="text-sm text-text font-medium">
              {q.index + 1}. {q.text.replace(/\s*\([^)]*[A-G]=[^)]+\)/, '').replace(/\s*[A-G]=.+$/, '').trim()}
            </label>
            <QuestionInput
              question={q}
              questionType={currentExercise.question_type}
              value={queue.answers[q.index] ?? ''}
              onChange={val => handleAnswerChange(q.index, val)}
            />
          </div>
        ))}
      </div>
    )

    const footer = (
      <div className="px-5 py-3 border-t border-surface0 shrink-0 flex items-center justify-between">
        <button onClick={handleBack} className="text-sm text-subtext0 hover:text-text transition-colors">
          ← {t('practice.abandon')}
        </button>
        <button
          onClick={handleSubmit}
          className="px-5 py-2 bg-mauve text-base rounded font-medium text-sm hover:bg-mauve/90 transition-colors"
        >
          {t('practice.check')}
        </button>
      </div>
    )

    const isSeries = queue.exercises.length > 1

    const header = (
      <div className="px-5 py-3 border-b border-surface0 shrink-0 flex items-center gap-2">
        <p className="text-sm font-medium text-text flex-1 truncate">{currentExercise.title}</p>
        <span className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded shrink-0">
          {currentExercise.question_type.replace(/_/g, ' ')}
        </span>
        {isSeries && (
          <span className="text-xs text-subtext0 shrink-0">
            {queue.currentIndex + 1} / {queue.exercises.length}
          </span>
        )}
      </div>
    )

    const player = (
      <AudioPlayer audioUrl={currentExercise.audio_url} sourceUrl={currentExercise.source_url} />
    )

    return (
      <>
        <div className="h-full flex flex-col overflow-hidden">
          {header}
          {currentExercise.image_url ? (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 h-full border-r border-surface0 overflow-y-auto p-4">
                <img
                  src={currentExercise.image_url}
                  alt={currentExercise.title}
                  onClick={() => setLightboxUrl(currentExercise.image_url!)}
                  className="w-full rounded-lg border border-surface1 object-contain cursor-zoom-in"
                />
              </div>
              <div className="w-1/2 h-full flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <div className="px-5 pt-4 pb-2">{player}</div>
                  {questions}
                </div>
                {footer}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                  <div className="px-5 pt-4 pb-2">{player}</div>
                  {questions}
                </div>
              </div>
              {footer}
            </div>
          )}
        </div>
        {lightboxUrl && <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      </>
    )
  }

  const isLastInSeries = queue.currentIndex === queue.exercises.length - 1
  const seriesProgress = queue.exercises.length > 1
    ? { current: queue.currentIndex + 1, total: queue.exercises.length }
    : undefined

  return (
    <div className="h-full overflow-y-auto">
      {saveError && (
        <div className="mx-6 mt-4 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-sm">
          ⚠ {t('practice.saveError')}
        </div>
      )}
      <ResultsPanel
        exercise={currentExercise}
        answers={queue.answers}
        section="listening"
        onNext={!isLastInSeries ? handleNext : undefined}
        onBack={handleBack}
        seriesProgress={seriesProgress}
      />
    </div>
  )
}
