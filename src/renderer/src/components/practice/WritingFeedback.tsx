import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WritingTask1, WritingTask2, AIWritingFeedback } from '../../types'
import { bandColor, isTask1 } from './writingUtils'
import { SectionTitle } from '../SectionTitle'
import { AnnotatedText } from './AnnotatedText'

interface WritingFeedbackProps {
  feedback: AIWritingFeedback | null
  exercise: WritingTask1 | WritingTask2
  userText?: string
}

export function WritingFeedback({ feedback, exercise, userText }: WritingFeedbackProps) {
  const { t } = useTranslation()
  const [modelOpen, setModelOpen] = useState(false)
  const t1 = isTask1(exercise)
  const keywords = t1 ? exercise.key_vocab : exercise.key_phrases

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      {/* Band header */}
      <div className="bg-surface0/50 rounded-xl p-5 text-center">
        {feedback ? (
          <>
            <div className={`text-5xl font-bold mb-1 ${bandColor(feedback.band)}`}>
              {feedback.band}
            </div>
            <div className="text-subtext0 text-sm">{t('writingFeedback.estimatedBand')}</div>
          </>
        ) : (
          <div className="text-subtext0 text-lg py-2">{t('writingFeedback.unavailable')}</div>
        )}
      </div>

      {feedback && (
        <>
          {/* Overall */}
          <p className="text-sm text-text leading-relaxed">{feedback.overall}</p>

          {/* Strengths + Improvements */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green/5 border border-green/20 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-green uppercase tracking-wide mb-2">
                {t('writingFeedback.strengths')}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-text flex gap-2">
                    <span className="text-green shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red/5 border border-red/20 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-red uppercase tracking-wide mb-2">
                {t('writingFeedback.improvements')}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {feedback.improvements.map((s, i) => (
                  <li key={i} className="text-xs text-text flex gap-2">
                    <span className="text-red shrink-0">✗</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Vocab suggestions */}
          <div>
            <SectionTitle className="mb-2">
              {t('writingFeedback.suggestedVocab')}
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {feedback.vocab_suggestions.map((v, i) => (
                <span key={i} className="text-xs bg-mauve/20 text-mauve px-2 py-0.5 rounded-full">
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Annotated text */}
          {userText && (
            <div className="border border-surface0 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <SectionTitle className="">
                  {t('writingFeedback.yourText')}
                </SectionTitle>
                <span className="flex items-center gap-1.5 text-xs text-subtext0">
                  <span className="w-3 h-0.5 bg-red inline-block rounded" /> {t('writingFeedback.grammarError')}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-subtext0">
                  <span className="w-3 h-0.5 bg-yellow inline-block rounded" /> {t('writingFeedback.contextError')}
                </span>
              </div>
              <AnnotatedText
                text={userText}
                annotations={feedback.word_annotations ?? []}
              />
            </div>
          )}

          {/* Sentence rewrites */}
          {feedback.sentence_rewrites && feedback.sentence_rewrites.length > 0 && (
            <div>
              <SectionTitle>
                {t('writingFeedback.sentenceRewrites')}
              </SectionTitle>
              <div className="flex flex-col gap-3">
                {feedback.sentence_rewrites.map((sr, i) => (
                  <div key={i} className="border border-surface0 rounded-lg p-4 flex flex-col gap-2">
                    <p className="text-xs text-red/80 line-through leading-relaxed">{sr.original}</p>
                    <p className="text-xs text-green leading-relaxed">{sr.rewritten}</p>
                    <p className="text-xs text-subtext0 italic">{sr.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Model answer — collapsible */}
      <div className="border border-surface0 rounded-lg overflow-hidden">
        <button
          onClick={() => setModelOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface0/30 text-sm font-medium text-text hover:bg-surface0/60 transition-colors"
        >
          <span>{t('writingFeedback.modelAnswer')} {exercise.band_target})</span>
          <span className="text-subtext0 text-xs">{modelOpen ? `▲ ${t('common.hide')}` : `▼ ${t('common.show')}`}</span>
        </button>
        {modelOpen && (
          <div className="p-4 flex flex-col gap-4">
            <p className="text-sm text-text leading-7 whitespace-pre-wrap">
              {exercise.model_answer}
            </p>
            <div>
              <SectionTitle className="mb-2">
                {t1 ? t('writingFeedback.keyVocab') : t('writingFeedback.keyPhrases')}
              </SectionTitle>
              <div className="flex flex-wrap gap-2">
                {keywords.map((k, i) => (
                  <span key={i} className="text-xs bg-green/20 text-green px-2 py-0.5 rounded-full">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
