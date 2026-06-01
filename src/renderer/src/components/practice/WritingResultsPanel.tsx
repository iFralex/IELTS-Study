import { useTranslation } from 'react-i18next'
import type { WritingTask1, WritingTask2, AIWritingFeedback } from '../../types'
import { isTask1 } from './writingUtils'
import { WritingFeedback } from './WritingFeedback'
import { ExerciseImage } from '../ExerciseImage'

interface WritingResultsPanelProps {
  exercise: WritingTask1 | WritingTask2
  feedback: AIWritingFeedback | null
  userText?: string
  timeSpentSeconds?: number
  onBack: () => void
  onNext?: () => void
  seriesProgress?: { current: number; total: number }
  errors?: React.ReactNode
}

export function WritingResultsPanel({
  exercise,
  feedback,
  userText,
  timeSpentSeconds,
  onBack,
  onNext,
  seriesProgress,
  errors,
}: WritingResultsPanelProps) {
  const { t } = useTranslation()
  const t1 = isTask1(exercise)
  const imageUrl = t1 ? exercise.image_url : undefined
  const prompt = t1 ? exercise.prompt : exercise.question

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Left column: image + prompt */}
        <div className="w-[45%] border-r border-surface0 overflow-y-auto p-4 flex flex-col gap-4 shrink-0">
          <p className="text-sm text-text leading-relaxed">{prompt}</p>
          {userText && (
            <p className="text-sm text-subtext0 leading-relaxed whitespace-pre-wrap border-t border-surface0 pt-4">{userText}</p>
          )}
          {imageUrl && <ExerciseImage src={imageUrl} alt="Chart" />}
        </div>
        {/* Right column: feedback */}
        <div className="flex-1 overflow-y-auto">
          {errors}
          <WritingFeedback feedback={feedback} exercise={exercise} userText={userText} timeSpentSeconds={timeSpentSeconds} />
        </div>
      </div>
      <div className="px-6 py-3 border-t border-surface0 shrink-0 flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-surface0 text-subtext0 hover:text-text rounded text-sm transition-colors"
        >
          {t('common.back')}
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
              {t('results.nextExercise')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
