import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Session, ListeningExercise, ReadingExercise, WritingTask1, WritingTask2, AIWritingFeedback } from '../types'
import { ResultsPanel } from '../components/practice/ResultsPanel'
import { ReadingPassage } from '../components/practice/ReadingPassage'
import { WritingResultsPanel } from '../components/practice/WritingResultsPanel'

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
    let feedback: AIWritingFeedback | null = null
    if (sessionFromState.feedback_json) {
      try { feedback = JSON.parse(sessionFromState.feedback_json) } catch {}
    }
    if (!feedback && sessionFromState.band_score != null) {
      feedback = { band: sessionFromState.band_score, overall: '', strengths: [], improvements: [], vocab_suggestions: [] }
    }
    return (
      <WritingResultsPanel
        exercise={exercise as WritingTask1 | WritingTask2}
        feedback={feedback}
        userText={sessionFromState.text ?? undefined}
        timeSpentSeconds={sessionFromState.time_spent_seconds ?? undefined}
        onBack={back}
      />
    )
  }

  // ── Reading review ───────────────────────────────────────────────────────────
  if (section === 'reading' && 'passage' in exercise) {
    return (
      <div className="h-full flex overflow-hidden">
        <div className="w-[55%] h-full border-r border-surface0 overflow-hidden flex flex-col">
          <ReadingPassage exercise={exercise as ReadingExercise} />
        </div>
        <div className="w-[45%] h-full overflow-hidden">
          <ResultsPanel
            exercise={exercise as ReadingExercise}
            answers={answers}
            section="reading"
            onBack={back}
            timeSpentSeconds={sessionFromState.time_spent_seconds ?? undefined}
          />
        </div>
      </div>
    )
  }

  // ── Listening review ─────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-hidden">
      <ResultsPanel
        exercise={exercise as ListeningExercise}
        answers={answers}
        section="listening"
        onBack={back}
        timeSpentSeconds={sessionFromState.time_spent_seconds ?? undefined}
      />
    </div>
  )
}
