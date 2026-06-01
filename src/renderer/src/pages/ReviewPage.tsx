import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Session, ListeningExercise, ReadingExercise, WritingTask1, WritingTask2 } from '../types'
import { ResultsPanel } from '../components/practice/ResultsPanel'
import { ReadingPassage } from '../components/practice/ReadingPassage'
import { WritingFeedback } from '../components/practice/WritingFeedback'
import { isTask1 } from '../components/practice/writingUtils'

export function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const sessionFromState = (location.state as { session?: Session } | null)?.session
  const [exercise, setExercise] = useState<ListeningExercise | ReadingExercise | WritingTask1 | WritingTask2 | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!sessionFromState || !sessionId) { setError(true); setLoading(false); return }
    const id = Number(sessionId)

    const fetchExercise = window.api.getExercise(sessionFromState.exercise_id)
    const fetchAnswers = sessionFromState.section !== 'writing'
      ? window.api.getSessionAnswers(id)
      : Promise.resolve([])

    Promise.all([fetchExercise, fetchAnswers])
      .then(([ex, ans]) => {
        if (!ex) { setError(true); return }
        setExercise(ex)
        const map: Record<number, string> = {}
        for (const a of ans) map[a.question_index] = a.user_answer
        setAnswers(map)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const back = () => navigate(-1)

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-subtext0 text-sm animate-pulse">{t('common.loading')}</p>
    </div>
  )

  if (error || !exercise || !sessionFromState) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-red text-sm">{t('practice.loadError')}</p>
      <button onClick={back} className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1">
        {t('common.back')}
      </button>
    </div>
  )

  const section = sessionFromState.section

  // ── Writing review ───────────────────────────────────────────────────────────
  if (section === 'writing') {
    const feedback = sessionFromState.band_score != null ? {
      band: sessionFromState.band_score,
      overall: '',
      strengths: [],
      improvements: [],
      vocab_suggestions: [],
    } : null
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-surface0 shrink-0 flex items-center gap-3">
          <button onClick={back} className="text-sm text-subtext0 hover:text-text transition-colors">← {t('common.back')}</button>
          <span className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded">
            {isTask1(exercise as WritingTask1 | WritingTask2)
              ? (exercise as WritingTask1).chart_type
              : (exercise as WritingTask2).essay_type.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <WritingFeedback
            feedback={feedback}
            exercise={exercise as WritingTask1 | WritingTask2}
            userText={sessionFromState.text ?? undefined}
          />
        </div>
      </div>
    )
  }

  // ── Reading review ───────────────────────────────────────────────────────────
  if (section === 'reading' && 'passage' in exercise) {
    return (
      <div className="h-full flex overflow-hidden">
        <div className="w-[55%] h-full border-r border-surface0 overflow-hidden flex flex-col">
          <ReadingPassage exercise={exercise as ReadingExercise} />
        </div>
        <div className="w-[45%] h-full overflow-y-auto">
          <ResultsPanel
            exercise={exercise as ReadingExercise}
            answers={answers}
            section="reading"
            onBack={back}
          />
        </div>
      </div>
    )
  }

  // ── Listening review ─────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">
      <ResultsPanel
        exercise={exercise as ListeningExercise}
        answers={answers}
        section="listening"
        onBack={back}
      />
    </div>
  )
}
