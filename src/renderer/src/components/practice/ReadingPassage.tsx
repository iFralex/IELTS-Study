import type { ReadingExercise } from '../../types'

interface ReadingPassageProps {
  exercise: ReadingExercise
  highlightText?: string
}

export function ReadingPassage({ exercise, highlightText }: ReadingPassageProps) {
  function renderPassage() {
    if (!highlightText) {
      return <span className="whitespace-pre-wrap">{exercise.passage}</span>
    }
    const lower = exercise.passage.toLowerCase()
    const searchLower = highlightText.toLowerCase()
    const idx = lower.indexOf(searchLower)
    if (idx === -1) {
      return <span className="whitespace-pre-wrap">{exercise.passage}</span>
    }
    const before = exercise.passage.slice(0, idx)
    const match = exercise.passage.slice(idx, idx + highlightText.length)
    const after = exercise.passage.slice(idx + highlightText.length)
    return (
      <span className="whitespace-pre-wrap">
        {before}
        <mark className="bg-yellow/40 text-text rounded px-0.5">{match}</mark>
        {after}
      </span>
    )
  }

  return (
    <div className="h-full flex flex-col bg-mantle/40">
      <div className="px-4 py-3 border-b border-surface0 shrink-0">
        <h2 className="font-semibold text-text text-sm">{exercise.title}</h2>
        <span className="inline-block mt-1 text-xs text-subtext0 bg-surface0 px-2 py-0.5 rounded">
          {exercise.question_type.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm leading-7 text-text">
        {renderPassage()}
      </div>
    </div>
  )
}
