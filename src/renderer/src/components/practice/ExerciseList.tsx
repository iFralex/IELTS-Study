import { useState } from 'react'
import type { ListeningExercise, ReadingExercise } from '../../types'
import { filterExercises, buildInterleavedSeries } from './utils'

type AnyExercise = ListeningExercise | ReadingExercise

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
  const [showCompleted, setShowCompleted] = useState(true)
  const [varyTypes, setVaryTypes] = useState(true)

  const allTypes = ['all', ...new Set(exercises.map(e => e.question_type))]
  const visible = filterExercises(exercises, completedIds, typeFilter, showCompleted)
  const seriesPool = visible.filter(e => !completedIds.has(e.id))
  const multipleTypes = new Set(seriesPool.map(e => e.question_type)).size > 1

  function handleStartSeries() {
    if (seriesPool.length === 0) return
    const ordered = varyTypes && multipleTypes
      ? buildInterleavedSeries(seriesPool, e => e.question_type)
      : [...seriesPool].sort(() => Math.random() - 0.5)
    onStartSeries(ordered)
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
    <div className="p-6 flex flex-col gap-4 max-w-3xl mx-auto">
      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex flex-wrap gap-2 flex-1">
          {allTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t ? 'bg-mauve text-base' : 'bg-surface0 text-subtext0 hover:text-text'
              }`}
            >
              {t === 'all' ? 'Tutti' : t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={handleStartSeries}
          disabled={seriesPool.length === 0}
          className="px-4 py-1.5 bg-mauve text-base rounded text-sm font-medium shrink-0
            hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ▶ Serie ({seriesPool.length})
        </button>
      </div>

      {/* Show completed toggle */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-subtext0 cursor-pointer">
          <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="accent-mauve" />
          Mostra già fatti
        </label>
        {multipleTypes && (
          <label className="flex items-center gap-2 text-sm text-subtext0 cursor-pointer">
            <input type="checkbox" checked={varyTypes} onChange={e => setVaryTypes(e.target.checked)} className="accent-mauve" />
            Varia i tipi
          </label>
        )}
      </div>

      {/* Exercise list */}
      {visible.length === 0 ? (
        <div className="text-center py-10 text-subtext0">
          <p>Tutti gli esercizi completati 🎉</p>
          <button onClick={() => setShowCompleted(true)} className="mt-3 text-sm text-mauve hover:underline">
            Mostra esercizi già fatti
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map(exercise => {
            const done = completedIds.has(exercise.id)
            return (
              <div
                key={exercise.id}
                onClick={() => onStartSingle(exercise)}
                className={`p-4 rounded-lg border border-surface0 bg-surface0/30 cursor-pointer
                  hover:border-mauve/60 hover:bg-surface0/60 transition-colors ${done ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{exercise.title}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs bg-surface1 text-subtext0 px-2 py-0.5 rounded">
                        {exercise.question_type.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        exercise.difficulty === 'hard' ? 'bg-red/20 text-red' : 'bg-yellow/20 text-yellow'
                      }`}>
                        {exercise.difficulty}
                      </span>
                    </div>
                  </div>
                  {done && (
                    <span className="text-xs bg-green/20 text-green px-2 py-0.5 rounded shrink-0">✓ Fatto</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
