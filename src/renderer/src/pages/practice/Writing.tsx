import { ErrorBanner } from '../../components/ErrorBanner'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { WritingTask1, WritingTask2, AIWritingFeedback } from '../../types'
import { WritingEditor } from '../../components/practice/WritingEditor'
import { WritingResultsPanel } from '../../components/practice/WritingResultsPanel'
import { ExerciseList } from '../../components/practice/ExerciseList'
import { countWords, isTask1 } from '../../components/practice/writingUtils'
import { ExerciseImage } from '../../components/ExerciseImage'
import { PracticeFooter } from '../../components/practice/PracticeFooter'

type TabType = 'task1' | 'task2' | 'all'
type Phase = 'selecting' | 'active' | 'results'

type WritingExercise = (WritingTask1 | WritingTask2) & { question_type: string }

interface ActiveSession {
  exercises: WritingExercise[]
  currentIndex: number
  startedAt: number
  text: string
}

function toWritingExercise(e: WritingTask1 | WritingTask2): WritingExercise {
  return { ...e, question_type: isTask1(e) ? (e as WritingTask1).chart_type : (e as WritingTask2).essay_type }
}

export function Writing() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabType>('all')
  const [phase, setPhase] = useState<Phase>('selecting')
  const [task1Exercises, setTask1Exercises] = useState<WritingTask1[]>([])
  const [task2Exercises, setTask2Exercises] = useState<WritingTask2[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [feedback, setFeedback] = useState<AIWritingFeedback | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalError, setEvalError] = useState(false)
  const [saveError, setSaveError] = useState(false)

  function load() {
    setLoadError(null)
    Promise.all([
      window.api.getExercises('writing/task1') as Promise<WritingTask1[]>,
      window.api.getExercises('writing/task2') as Promise<WritingTask2[]>,
      window.api.getCompletedExerciseIds('writing'),
    ])
      .then(([t1, t2, ids]) => {
        setTask1Exercises(t1)
        setTask2Exercises(t2)
        setCompletedIds(new Set(ids))
      })
      .catch(() => setLoadError(t('practice.loadError')))
  }

  useEffect(() => { load() }, [])

  const exercises: WritingExercise[] = (
    tab === 'all' ? [...task1Exercises, ...task2Exercises] :
    tab === 'task1' ? task1Exercises : task2Exercises
  ).map(toWritingExercise)

  function startSession(exs: WritingExercise[]) {
    setSession({ exercises: exs, currentIndex: 0, startedAt: Date.now(), text: '' })
    setFeedback(null)
    setEvalError(false)
    setSaveError(false)
    setPhase('active')
  }

  function handleTabChange(next: TabType) {
    setTab(next)
    setPhase('selecting')
    setSession(null)
    setFeedback(null)
    setEvalError(false)
    setSaveError(false)
  }

  function handleNext() {
    if (!session) return
    setSession({ ...session, currentIndex: session.currentIndex + 1, startedAt: Date.now(), text: '' })
    setFeedback(null)
    setEvalError(false)
    setSaveError(false)
    setPhase('active')
  }

  function handleTextChange(text: string) {
    setSession(s => s ? { ...s, text } : s)
  }

  async function handleSubmit() {
    if (!session) return
    const exercise = session.exercises[session.currentIndex]
    const taskType = isTask1(exercise) ? 'task1' : 'task2'
    const completedAt = Date.now()
    const { text, startedAt } = session
    const wordCount = countWords(text)
    const prompt = isTask1(exercise) ? (exercise as WritingTask1).prompt : (exercise as WritingTask2).question
    setIsEvaluating(true)
    let fb: AIWritingFeedback | null = null
    try {
      fb = await window.api.evaluateWriting(taskType, text, prompt, wordCount)
    } catch {
      setEvalError(true)
    }
    setIsEvaluating(false)
    try {
      await window.api.saveWritingSubmission({
        task_id: exercise.id,
        task_type: taskType,
        submitted_at: startedAt,
        completed_at: completedAt,
        text,
        word_count: wordCount,
        band_score: fb?.band,
        feedback_json: fb ? JSON.stringify(fb) : undefined,
      })
      setCompletedIds(prev => new Set([...prev, exercise.id]))
    } catch {
      setSaveError(true)
    }
    setFeedback(fb)
    setPhase('results')
  }

  function handleBack() {
    setSession(null)
    setFeedback(null)
    setEvalError(false)
    setSaveError(false)
    setPhase('selecting')
  }

  // ── Selecting phase ──────────────────────────────────────────────────────────
  if (phase === 'selecting') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-surface0 shrink-0">
          <h1 className="text-xl font-bold text-text mb-3">{t('practice.writingTitle')}</h1>
          <div className="flex flex-wrap gap-2">
            {(['all', 'task1', 'task2'] as TabType[]).map(tabKey => (
              <button
                key={tabKey}
                onClick={() => handleTabChange(tabKey)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  tab === tabKey ? 'bg-mauve text-base' : 'bg-surface0 text-subtext0 hover:text-text'
                }`}
              >
                {tabKey === 'task1' ? t('practice.task1Tab') : tabKey === 'task2' ? t('practice.task2Tab') : t('exerciseList.all')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ExerciseList
            key={tab}
            exercises={exercises}
            completedIds={completedIds}
            onStartSingle={ex => startSession([ex])}
            onStartSeries={exs => startSession(exs)}
            error={loadError}
            onRetry={load}
            renderCard={(exercise, done) => {
              const t1 = isTask1(exercise)
              return (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text line-clamp-2">
                      {t1 ? (exercise as WritingTask1).prompt : (exercise as WritingTask2).topic}
                    </p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {tab === 'all' && (
                        <span className="text-xs bg-mauve/20 text-mauve px-2 py-0.5 rounded">
                          {t1 ? 'Task 1' : 'Task 2'}
                        </span>
                      )}
                      <span className="text-xs bg-surface1 text-subtext0 px-2 py-0.5 rounded">
                        {exercise.question_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs bg-blue/20 text-blue px-2 py-0.5 rounded">
                        {t('practice.bandTarget')} {exercise.band_target}
                      </span>
                    </div>
                  </div>
                  {done && <span className="text-xs bg-green/20 text-green px-2 py-0.5 rounded shrink-0">✓ {t('exerciseList.done')}</span>}
                </div>
              )
            }}
          />
        </div>
      </div>
    )
  }

  if (!session) return null

  const exercise = session.exercises[session.currentIndex]
  const t1 = isTask1(exercise)
  const taskType = t1 ? 'task1' : 'task2'
  const imageUrl = t1 ? (exercise as WritingTask1).image_url : undefined
  const prompt = t1 ? (exercise as WritingTask1).prompt : (exercise as WritingTask2).question
  const isSeries = session.exercises.length > 1
  const minWords = t1 ? 150 : 250

  // ── Active phase ─────────────────────────────────────────────────────────────
  if (phase === 'active') {
    const header = (
      <div className="px-5 py-3 border-b border-surface0 shrink-0 flex items-center gap-2">
        <span className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded">
          {exercise.question_type.replace(/_/g, ' ')}
        </span>
        <span className="text-xs text-subtext0">{taskType === 'task1' ? 'Task 1' : 'Task 2'}</span>
        {isSeries && (
          <span className="text-xs text-subtext0">· {session.currentIndex + 1} / {session.exercises.length}</span>
        )}
      </div>
    )

    const footer = (
      <PracticeFooter onBack={handleBack}>
        <div className="flex items-center gap-3">
          {(() => {
            const wc = countWords(session.text)
            const color = wc === 0 ? 'text-subtext0' : wc >= minWords ? 'text-green' : 'text-yellow'
            return <span className={`text-xs font-mono ${color}`}>{wc} / {minWords} {t('common.words')}</span>
          })()}
          {isEvaluating ? (
            <span className="text-sm text-subtext0 animate-pulse">{t('reviewSession.evaluating')}</span>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={session.text.trim() === ''}
              className="px-5 py-2 bg-mauve text-base rounded font-medium text-sm
                hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('chat.send')} ▶
            </button>
          )}
        </div>
      </PracticeFooter>
    )

    return (
      <div className="h-full flex flex-col overflow-hidden">
          {header}
          {imageUrl ? (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 h-full border-r border-surface0 overflow-y-auto p-4">
                <ExerciseImage src={imageUrl!} alt="Chart" />
              </div>
              <div className="w-1/2 h-full flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b border-surface0 shrink-0 max-h-[30%] overflow-y-auto">
                  <p className="text-sm text-text leading-relaxed">{prompt}</p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <WritingEditor taskType={taskType} value={session.text} onChange={handleTextChange} disabled={isEvaluating} />
                </div>
                {footer}
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-surface0 shrink-0 max-h-[30%] overflow-y-auto">
                {t1 && (
                  <div className="flex items-center justify-center h-12 bg-surface0/30 rounded mb-3 text-sm text-subtext0">
                    {t('practice.imageUnavailable')}
                  </div>
                )}
                <p className="text-sm text-text leading-relaxed">{prompt}</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <WritingEditor taskType={taskType} value={session.text} onChange={handleTextChange} disabled={isEvaluating} />
              </div>
              {footer}
            </>
          )}
      </div>
    )
  }

  // ── Results phase ────────────────────────────────────────────────────────────
  return (
    <WritingResultsPanel
      exercise={exercise}
      feedback={feedback}
      userText={session.text}
      onBack={handleBack}
      onNext={session.currentIndex < session.exercises.length - 1 ? handleNext : undefined}
      seriesProgress={isSeries ? { current: session.currentIndex + 1, total: session.exercises.length } : undefined}
      errors={
        <>
          {evalError && <ErrorBanner message={t('practice.aiUnavailable')} className="mx-6 mt-4" />}
          {saveError && <ErrorBanner message={t('practice.sendError')} className="mx-6 mt-4" />}
        </>
      }
    />
  )
}
