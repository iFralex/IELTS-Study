import { useState } from 'react'
import type { ListeningExercise, ReadingExercise } from '../../types'
import { scoreAnswers, estimateBand, findPassageExcerpt } from './utils'

type AnyExercise = ListeningExercise | ReadingExercise

interface ResultsPanelProps {
  exercise: AnyExercise
  answers: Record<number, string>
  section: 'listening' | 'reading'
  onNext?: () => void
  onBack: () => void
  seriesProgress?: { current: number; total: number }
}

function isReadingExercise(e: AnyExercise): e is ReadingExercise {
  return 'passage' in e
}

export function ResultsPanel({
  exercise,
  answers,
  section,
  onNext,
  onBack,
  seriesProgress,
}: ResultsPanelProps) {
  const [expandedHighlight, setExpandedHighlight] = useState<number | null>(null)
  const { correctCount, maxScore } = scoreAnswers(exercise.questions, answers)
  const band = estimateBand(correctCount, maxScore)
  const pct = maxScore > 0 ? Math.round((correctCount / maxScore) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      {/* Score header */}
      <div className="bg-surface0/50 rounded-xl p-5 text-center">
        <div className="text-5xl font-bold text-text mb-1">
          {correctCount}
          <span className="text-2xl text-subtext0 font-normal"> / {maxScore}</span>
        </div>
        <div className="text-subtext0 text-sm mb-2">{pct}% corretto</div>
        <div className="inline-flex items-center gap-1.5 bg-mauve/20 text-mauve px-3 py-1 rounded-full text-sm font-medium">
          Band stimata: {band === 8 ? '8–9' : band}
        </div>
      </div>

      {/* Per-question results */}
      <div className="flex flex-col gap-3">
        {exercise.questions.map(q => {
          const userAnswer = answers[q.index] ?? ''
          const correct = userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim()
          const passage = isReadingExercise(exercise) ? exercise.passage : null
          const isHighlightOpen = expandedHighlight === q.index

          return (
            <div
              key={q.index}
              className={`rounded-lg border p-4 text-sm ${
                correct ? 'border-green/30 bg-green/5' : 'border-red/30 bg-red/5'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={correct ? 'text-green shrink-0' : 'text-red shrink-0'}>
                  {correct ? '✓' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-text font-medium leading-snug">{q.text}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className={correct ? 'text-green' : 'text-red'}>
                      La tua risposta: <strong>{userAnswer || '(vuota)'}</strong>
                    </span>
                    {!correct && (
                      <span className="text-green">
                        Risposta corretta: <strong>{q.answer}</strong>
                      </span>
                    )}
                  </div>

                  {/* Explanation — always show if present */}
                  {q.explanation && (
                    <p className="mt-2 text-xs text-subtext0 leading-relaxed border-l-2 border-surface1 pl-2">
                      {q.explanation}
                    </p>
                  )}

                  {/* "Trova nel brano" — Reading only, wrong answers only */}
                  {!correct && section === 'reading' && passage && (
                    <button
                      onClick={() => setExpandedHighlight(isHighlightOpen ? null : q.index)}
                      className="mt-2 text-xs text-blue hover:underline"
                    >
                      {isHighlightOpen ? '▲ Nascondi' : '▼ Trova nel brano'}
                    </button>
                  )}

                  {isHighlightOpen && passage && (() => {
                    const result = findPassageExcerpt(passage, q.text, q.answer, (exercise as ReadingExercise).question_type)
                    if (!result) return (
                      <p className="mt-2 text-xs text-subtext0 italic">
                        Testo non trovato nel brano.
                      </p>
                    )
                    const { excerpt, term } = result
                    const parts = excerpt.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'))
                    return (
                      <div className="mt-2 p-3 bg-surface0 rounded text-xs text-subtext0 leading-relaxed">
                        {parts.map((part, i) =>
                          i % 2 === 1
                            ? <mark key={i} className="bg-yellow/40 text-text rounded px-0.5">{part}</mark>
                            : <span key={i}>{part}</span>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-surface0">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-surface0 text-subtext0 hover:text-text rounded text-sm transition-colors"
        >
          ← Torna alla lista
        </button>
        <div className="flex items-center gap-3">
          {seriesProgress && (
            <span className="text-xs text-subtext0">
              {seriesProgress.current} / {seriesProgress.total}
            </span>
          )}
          {onNext && (
            <button
              onClick={onNext}
              className="px-4 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors"
            >
              Prossimo →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
