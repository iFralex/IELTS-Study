import { useState } from 'react'
import type { ListeningExercise, ReadingExercise } from '../../types'
import { filterExercises, buildSeries } from './utils'

type AnyExercise = ListeningExercise | ReadingExercise
type Mode = 'single' | 'type' | 'random'

interface ExerciseListProps {
  section: 'listening' | 'reading'
  exercises: AnyExercise[]
  completedIds: Set<string>
  onStartSingle: (exercise: AnyExercise) => void
  onStartSeries: (exercises: AnyExercise[]) => void
  error: string | null
  onRetry: () => void
}

export function ExerciseList({
  exercises,
  completedIds,
  onStartSingle,
  onStartSeries,
  error,
  onRetry,
}: ExerciseListProps) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [mode, setMode] = useState<Mode>('single')
  const [showCompleted, setShowCompleted] = useState(true)

  const allTypes = ['all', ...new Set(exercises.map(e => e.question_type))]
  const visible = filterExercises(exercises, completedIds, typeFilter, showCompleted)

  const undoneCount = exercises.filter(e => !completedIds.has(e.id)).length
  const allDone = undoneCount === 0 && !showCompleted

  function handleStartSeries() {
    const queue = buildSeries(exercises, mode === 'random' ? 'random' : 'type', typeFilter, completedIds)
    if (queue.length > 0) onStartSeries(queue)
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <p className="text-red">{error}</p>
        <button onClick={onRetry} className="px-4 py-2 bg-surface0 text-text rounded hover:bg-surface1 text-sm">
          Riprova
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-5 max-w-3xl mx-auto">
      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {allTypes.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              typeFilter === t
                ? 'bg-mauve text-base'
                : 'bg-surface0 text-subtext0 hover:text-text'
            }`}
          >
            {t === 'all' ? 'Tutti' : t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {(['single', 'type', 'random'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${
              mode === m
                ? 'bg-blue/20 text-blue border border-blue/40'
                : 'bg-surface0 text-subtext0 hover:text-text'
            }`}
          >
            {m === 'single' ? 'Singolo' : m === 'type' ? 'Serie per tipo' : 'Casuale'}
          </button>
        ))}
      </div>

      {/* Show completed toggle */}
      <label className="flex items-center gap-2 text-sm text-subtext0 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={e => setShowCompleted(e.target.checked)}
          className="accent-mauve"
        />
        Mostra già fatti
      </label>

      {/* Exercise list */}
      {allDone ? (
        <div className="text-center py-10 text-subtext0">
          <p className="text-lg">Tutti gli esercizi completati 🎉</p>
          <button
            onClick={() => setShowCompleted(true)}
            className="mt-3 text-sm text-mauve hover:underline"
          >
            Mostra esercizi già fatti
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map(exercise => {
            const done = completedIds.has(exercise.id)
            const clickable = mode === 'single'
            return (
              <div
                key={exercise.id}
                onClick={() => clickable && onStartSingle(exercise)}
                className={`p-4 rounded-lg border transition-colors ${
                  clickable
                    ? 'cursor-pointer hover:border-mauve/60 hover:bg-surface0/60'
                    : 'cursor-default'
                } ${done ? 'opacity-50' : ''} bg-surface0/30 border-surface0`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {exercise.title}
                    </p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs bg-surface1 text-subtext0 px-2 py-0.5 rounded">
                        {exercise.question_type.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        exercise.difficulty === 'hard'
                          ? 'bg-red/20 text-red'
                          : 'bg-yellow/20 text-yellow'
                      }`}>
                        {exercise.difficulty}
                      </span>
                    </div>
                  </div>
                  {done && (
                    <span className="text-xs bg-green/20 text-green px-2 py-0.5 rounded shrink-0">
                      ✓ Fatto
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Start series button */}
      {mode !== 'single' && !allDone && (
        <div className="pt-2 border-t border-surface0">
          <button
            onClick={handleStartSeries}
            disabled={undoneCount === 0}
            className="flex items-center gap-2 px-5 py-2 bg-mauve text-base rounded font-medium text-sm
              hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ▶ Inizia serie
            {undoneCount > 0 && (
              <span className="text-xs opacity-70">
                ({mode === 'random' ? `max 10 di ${undoneCount}` : `${undoneCount} disponibili`})
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
