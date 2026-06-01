import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { filterExercises, buildInterleavedSeries } from './utils'

interface ExerciseListProps<T extends { id: string; question_type: string }> {
  exercises: T[]
  completedIds: Set<string>
  onStartSingle: (exercise: T) => void
  onStartSeries: (exercises: T[]) => void
  error: string | null
  onRetry: () => void
  renderCard: (exercise: T, done: boolean) => ReactNode
}

export function ExerciseList<T extends { id: string; question_type: string }>({
  exercises,
  completedIds,
  onStartSingle,
  onStartSeries,
  error,
  onRetry,
  renderCard,
}: ExerciseListProps<T>) {
  const { t } = useTranslation()
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCompleted, setShowCompleted] = useState(true)
  const [varyTypes, setVaryTypes] = useState(true)

  const allTypes = ['all', ...new Set(exercises.map(e => e.question_type))]
  const visible = filterExercises(exercises, completedIds, typeFilter, showCompleted)
  const seriesPool = visible.filter(e => !completedIds.has(e.id))
  const multipleTypes = new Set(seriesPool.map(e => e.question_type)).size > 1

  function handleStartSeries() {
    if (seriesPool.length === 0) return
    if (varyTypes && multipleTypes) {
      const typeCoverage = new Map<string, number>()
      for (const type of new Set(exercises.map(e => e.question_type))) {
        const total = exercises.filter(e => e.question_type === type).length
        const done = exercises.filter(e => e.question_type === type && completedIds.has(e.id)).length
        typeCoverage.set(type, total > 0 ? done / total : 0)
      }
      onStartSeries(buildInterleavedSeries(seriesPool, e => e.question_type, typeCoverage))
    } else {
      onStartSeries([...seriesPool].sort(() => Math.random() - 0.5))
    }
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <p className="text-red">{error}</p>
        <button onClick={onRetry} className="px-4 py-2 bg-surface0 text-text rounded hover:bg-surface1 text-sm">
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-4 max-w-3xl mx-auto">
      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex flex-wrap gap-2 flex-1">
          {allTypes.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === type ? 'bg-mauve text-base' : 'bg-surface0 text-subtext0 hover:text-text'
              }`}
            >
              {type === 'all' ? t('exerciseList.all') : type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <button
          onClick={handleStartSeries}
          disabled={seriesPool.length === 0}
          className="px-4 py-1.5 bg-mauve text-base rounded text-sm font-medium shrink-0
            hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('exerciseList.series')}{seriesPool.length})
        </button>
      </div>

      {/* Toggles row */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-subtext0 cursor-pointer">
          <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="accent-mauve" />
          {t('exerciseList.showDone')}
        </label>
        {multipleTypes && (
          <label className="flex items-center gap-2 text-sm text-subtext0 cursor-pointer">
            <input type="checkbox" checked={varyTypes} onChange={e => setVaryTypes(e.target.checked)} className="accent-mauve" />
            {t('exerciseList.varyTypes')}
          </label>
        )}
      </div>

      {/* Exercise list */}
      {visible.length === 0 ? (
        <div className="text-center py-10 text-subtext0">
          <p>{t('exerciseList.allDone')}</p>
          <button onClick={() => setShowCompleted(true)} className="mt-3 text-sm text-mauve hover:underline">
            {t('exerciseList.showCompleted')}
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
                {renderCard(exercise, done)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
