import { useState, useEffect } from 'react'
import type { ListeningExercise } from '../../types'
import { ExerciseList } from '../../components/practice/ExerciseList'
import { AudioPlayer } from '../../components/practice/AudioPlayer'
import { QuestionInput } from '../../components/practice/QuestionInput'
import { ResultsPanel } from '../../components/practice/ResultsPanel'
import { scoreAnswers, normalizeAnswer } from '../../components/practice/utils'

type Phase = 'selecting' | 'active' | 'results'

interface Queue {
  exercises: ListeningExercise[]
  currentIndex: number
  startedAt: number
  answers: Record<number, string>
}

export function Listening() {
  const [phase, setPhase] = useState<Phase>('selecting')
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
      .catch(() => setLoadError('Errore nel caricamento degli esercizi.'))
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
          is_correct: normalizeAnswer(queue.answers[q.index] ?? '') === normalizeAnswer(q.answer),
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
          <h1 className="text-xl font-bold text-text">Listening Practice</h1>
          <p className="text-sm text-subtext0 mt-0.5">{exercises.length} esercizi disponibili</p>
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
    return (
      <div className="h-full flex flex-col">
        <AudioPlayer
          audioUrl={currentExercise.audio_url}
          title={currentExercise.title}
          sourceUrl={currentExercise.source_url}
        />
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="max-w-2xl mx-auto flex flex-col gap-5">
            {currentExercise.image_url && (
              <img
                src={currentExercise.image_url}
                alt={currentExercise.title}
                className="w-full rounded-lg border border-surface1 object-contain max-h-96"
              />
            )}
            {currentExercise.questions.map(q => (
              <div key={q.index} className="flex flex-col gap-2">
                <label className="text-sm text-text font-medium">
                  {q.index + 1}. {q.text}
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
        </div>
        <div className="px-5 py-3 border-t border-surface0 shrink-0 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-sm text-subtext0 hover:text-text transition-colors"
          >
            ← Abbandona
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-mauve text-base rounded font-medium text-sm hover:bg-mauve/90 transition-colors"
          >
            Controlla
          </button>
        </div>
      </div>
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
          ⚠ Sessione non salvata — nessuna connessione al database.
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
