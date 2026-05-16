import { useState, useEffect } from 'react'
import type { WritingTask1, WritingTask2, AIWritingFeedback } from '../../types'
import { WritingEditor } from '../../components/practice/WritingEditor'
import { WritingFeedback } from '../../components/practice/WritingFeedback'
import { countWords, isTask1 } from '../../components/practice/writingUtils'
import { buildInterleavedSeries } from '../../components/practice/utils'
import { Lightbox } from '../../components/Lightbox'

type Phase = 'selecting' | 'active' | 'results'
type TaskType = 'task1' | 'task2'

interface ActiveSession {
  exercises: (WritingTask1 | WritingTask2)[]
  currentIndex: number
  taskType: TaskType
  startedAt: number
  text: string
}

export function Writing() {
  const [taskType, setTaskType] = useState<TaskType>('task1')
  const [phase, setPhase] = useState<Phase>('selecting')
  const [task1Exercises, setTask1Exercises] = useState<WritingTask1[]>([])
  const [task2Exercises, setTask2Exercises] = useState<WritingTask2[]>([])
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [feedback, setFeedback] = useState<AIWritingFeedback | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [varyTypes, setVaryTypes] = useState(true)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalError, setEvalError] = useState(false)
  const [saveError, setSaveError] = useState(false)

  function load() {
    setLoadError(null)
    Promise.all([
      window.api.getExercises('writing/task1') as Promise<WritingTask1[]>,
      window.api.getExercises('writing/task2') as Promise<WritingTask2[]>,
    ])
      .then(([t1, t2]) => {
        setTask1Exercises(t1)
        setTask2Exercises(t2)
      })
      .catch(() => setLoadError('Errore nel caricamento degli esercizi.'))
  }

  useEffect(() => { load() }, [])

  function handleTabChange(t: TaskType) {
    setTaskType(t)
    setPhase('selecting')
    setSession(null)
    setFeedback(null)
    setEvalError(false)
    setSaveError(false)
  }

  function handleStart(exercise: WritingTask1 | WritingTask2) {
    setSession({ exercises: [exercise], currentIndex: 0, taskType, startedAt: Date.now(), text: '' })
    setFeedback(null)
    setEvalError(false)
    setSaveError(false)
    setPhase('active')
  }

  function handleStartSeries(exs: (WritingTask1 | WritingTask2)[]) {
    const getType = (e: WritingTask1 | WritingTask2) =>
      isTask1(e) ? (e as WritingTask1).chart_type : (e as WritingTask2).essay_type
    const multipleTypes = new Set(exs.map(getType)).size > 1
    const ordered = varyTypes && multipleTypes
      ? buildInterleavedSeries(exs, getType)
      : [...exs].sort(() => Math.random() - 0.5)
    setSession({ exercises: ordered, currentIndex: 0, taskType, startedAt: Date.now(), text: '' })
    setFeedback(null)
    setEvalError(false)
    setSaveError(false)
    setPhase('active')
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
    const { taskType: tt, text, startedAt } = session
    const wordCount = countWords(text)
    const prompt = isTask1(exercise) ? exercise.prompt : exercise.question
    setIsEvaluating(true)
    let fb: AIWritingFeedback | null = null
    try {
      fb = await window.api.evaluateWriting(tt, text, prompt, wordCount)
    } catch {
      setEvalError(true)
    }
    setIsEvaluating(false)
    try {
      await window.api.saveWritingSubmission({
        task_id: exercise.id,
        task_type: tt,
        submitted_at: startedAt,
        text,
        word_count: wordCount,
        band_score: fb?.band,
      })
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

  const exercises = taskType === 'task1' ? task1Exercises : task2Exercises

  // ── Selecting phase ──────────────────────────────────────────────────────────
  if (phase === 'selecting') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-surface0 shrink-0">
          <h1 className="text-xl font-bold text-text">Writing Practice</h1>
          <div className="flex gap-2 mt-3">
            {(['task1', 'task2'] as TaskType[]).map(t => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`px-4 py-1.5 rounded text-sm transition-colors ${
                  taskType === t
                    ? 'bg-mauve text-base font-medium'
                    : 'bg-surface0 text-subtext0 hover:text-text'
                }`}
              >
                {t === 'task1' ? 'Task 1 — Grafico' : 'Task 2 — Essay'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loadError ? (
            <div className="flex flex-col items-center gap-4 pt-10">
              <p className="text-red text-sm">{loadError}</p>
              <button onClick={load} className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1">
                Riprova
              </button>
            </div>
          ) : exercises.length === 0 ? (
            <p className="text-subtext0 text-sm text-center pt-10">Nessun esercizio disponibile.</p>
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              <div className="flex items-center justify-between">
                {(() => {
                  const getType = (e: WritingTask1 | WritingTask2) =>
                    isTask1(e) ? (e as WritingTask1).chart_type : (e as WritingTask2).essay_type
                  const multipleTypes = new Set(exercises.map(getType)).size > 1
                  return multipleTypes ? (
                    <label className="flex items-center gap-2 text-sm text-subtext0 cursor-pointer">
                      <input type="checkbox" checked={varyTypes} onChange={e => setVaryTypes(e.target.checked)} className="accent-mauve" />
                      Varia i tipi
                    </label>
                  ) : <span />
                })()}
                <button
                  onClick={() => handleStartSeries(exercises)}
                  className="px-4 py-1.5 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors"
                >
                  ▶ Serie ({exercises.length})
                </button>
              </div>
              <div className="flex flex-col gap-2">
              {exercises.map(exercise => {
                const t1 = isTask1(exercise)
                return (
                  <div
                    key={exercise.id}
                    onClick={() => handleStart(exercise)}
                    className="p-4 rounded-lg border border-surface0 bg-surface0/30 cursor-pointer
                      hover:border-mauve/60 hover:bg-surface0/60 transition-colors"
                  >
                    <p className="text-sm font-medium text-text line-clamp-2">
                      {t1 ? exercise.prompt : exercise.topic}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-surface1 text-subtext0 px-2 py-0.5 rounded">
                        {t1 ? exercise.chart_type : exercise.essay_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs bg-blue/20 text-blue px-2 py-0.5 rounded">
                        Band target: {exercise.band_target}
                      </span>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!session) return null

  // ── Active phase ─────────────────────────────────────────────────────────────
  if (phase === 'active') {
    const exercise = session.exercises[session.currentIndex]
    const t1 = isTask1(exercise)
    const imageUrl = t1 ? (exercise as WritingTask1).image_url : undefined
    const prompt = t1 ? (exercise as WritingTask1).prompt : (exercise as WritingTask2).question
    const isSeries = session.exercises.length > 1

    const header = (
      <div className="px-5 py-3 border-b border-surface0 shrink-0 flex items-center gap-2">
        <span className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded">
          {t1 ? (exercise as WritingTask1).chart_type : (exercise as WritingTask2).essay_type.replace(/_/g, ' ')}
        </span>
        <span className="text-xs text-subtext0">{taskType === 'task1' ? 'Task 1' : 'Task 2'}</span>
        {isSeries && (
          <span className="text-xs text-subtext0">· {session.currentIndex + 1} / {session.exercises.length}</span>
        )}
      </div>
    )

    const footer = (
      <div className="px-5 py-3 border-t border-surface0 shrink-0 flex items-center justify-between gap-3">
        <button onClick={handleBack} className="text-sm text-subtext0 hover:text-text transition-colors">
          ← Abbandona
        </button>
        <div className="flex items-center gap-3">
          {(() => {
            const wc = countWords(session.text)
            const min = taskType === 'task1' ? 150 : 250
            const color = wc === 0 ? 'text-subtext0' : wc >= min ? 'text-green' : 'text-yellow'
            return <span className={`text-xs font-mono ${color}`}>{wc} / {min} parole</span>
          })()}
          {isEvaluating ? (
            <span className="text-sm text-subtext0 animate-pulse">Valutazione in corso…</span>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={session.text.trim() === ''}
              className="px-5 py-2 bg-mauve text-base rounded font-medium text-sm
                hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Invia ▶
            </button>
          )}
        </div>
      </div>
    )

    return (
      <>
        <div className="h-full flex flex-col overflow-hidden">
          {header}
          {imageUrl ? (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 h-full border-r border-surface0 overflow-y-auto p-4">
                <img
                  src={imageUrl}
                  alt="Chart"
                  onClick={() => setLightboxUrl(imageUrl)}
                  className="w-full rounded-lg border border-surface1 object-contain cursor-zoom-in"
                />
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
                    Immagine non disponibile
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
        {lightboxUrl && <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      </>
    )
  }

  // ── Results phase ────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {evalError && (
          <div className="mx-6 mt-4 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-sm">
            ⚠ Valutazione AI non disponibile — il testo è stato salvato.
          </div>
        )}
        {saveError && (
          <div className="mx-6 mt-4 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-sm">
            ⚠ Invio non salvato — nessuna connessione al database.
          </div>
        )}
        <WritingFeedback
          feedback={feedback}
          exercise={session.exercises[session.currentIndex]}
        />
      </div>
      <div className="px-6 py-3 border-t border-surface0 shrink-0 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-surface0 text-subtext0 hover:text-text rounded text-sm transition-colors"
        >
          ← Torna alla lista
        </button>
        {session.currentIndex < session.exercises.length - 1 && (
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors"
          >
            Prossimo ({session.currentIndex + 2} / {session.exercises.length}) →
          </button>
        )}
      </div>
    </div>
  )
}
